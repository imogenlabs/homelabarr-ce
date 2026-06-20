import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';

// HLCE-215: brute-force defenses (SQLite-backed login limiter + account lockout).
// ratelimit.js imports the `db` singleton from db.js at module load, so every
// test resets the module registry and re-imports with DB_PATH pointing at a
// throwaway in-memory database (or a file, for the restart-persistence case).
// Dynamic import() is required so the env is in place before db.js evaluates it.
let tmp;

async function loadRl({ dbPath = ':memory:' } = {}) {
  vi.resetModules();
  process.env.DB_PATH = dbPath;
  process.env.DATA_DIR = tmp;
  // Point at a non-existent dir so no real SQLCipher secret leaks into the test DB.
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
  return import('./ratelimit.js');
}

// Minimal Express app that runs the limiter and returns whatever status the
// caller chooses, so we can drive both success and failure paths via supertest.
// All requests come from the same socket (one IP), which is exactly the
// "from one IP" scenario the login limiter keys on.
function miniApp(limiter, statusFor) {
  const app = express();
  app.post('/login', limiter, (_req, res) => res.status(statusFor()).json({}));
  return app;
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-rl-'));
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const k of ['DB_PATH', 'DATA_DIR', 'SECRET_ROOT', 'RATE_LIMIT_DISABLED']) {
    delete process.env[k];
  }
});

describe('SqliteStore (AC1)', () => {
  it('counts hits within a window and resets the bucket once the window passes', async () => {
    const { SqliteStore } = await loadRl();
    vi.useFakeTimers();
    const T0 = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(T0);

    const store = new SqliteStore(1000);
    const a = await store.increment('k');
    expect(a.totalHits).toBe(1);
    expect(a.resetTime).toEqual(new Date(T0 + 1000));

    const b = await store.increment('k');
    expect(b.totalHits).toBe(2);
    // Reset time is pinned to the first hit's window, not bumped on each hit.
    expect(b.resetTime).toEqual(new Date(T0 + 1000));

    // Cross the reset boundary: the next hit starts a fresh window at 1.
    vi.setSystemTime(T0 + 1001);
    const c = await store.increment('k');
    expect(c.totalHits).toBe(1);
    expect(c.resetTime).toEqual(new Date(T0 + 1001 + 1000));
  });

  it('tracks keys independently; resetKey clears a bucket and decrement is a no-op', async () => {
    const { SqliteStore } = await loadRl();
    const store = new SqliteStore(60_000);

    await store.increment('a');
    await store.increment('a');
    await store.increment('b');
    expect((await store.increment('a')).totalHits).toBe(3);
    expect((await store.increment('b')).totalHits).toBe(2);

    // decrement() is intentionally a no-op in this store (see the AC4 divergence
    // test below) — calling it must not change the count.
    await store.decrement('a');
    expect((await store.increment('a')).totalHits).toBe(4);

    await store.resetKey('a');
    expect((await store.increment('a')).totalHits).toBe(1);
    // resetKey only touches the named key.
    expect((await store.increment('b')).totalHits).toBe(3);
  });
});

describe('createLockoutGuard (AC2, AC3)', () => {
  it('locks on the 15th consecutive failure (not the 14th); onSuccess clears the counter', async () => {
    const { createLockoutGuard } = await loadRl();
    const guard = createLockoutGuard();

    for (let i = 0; i < 14; i++) expect(guard.onFail('alice')).toBe(false);
    expect(guard.isLocked('alice')).toBe(false);

    expect(guard.onFail('alice')).toBe(true); // 15th fail trips the lock
    expect(guard.isLocked('alice')).toBe(true);

    guard.onSuccess('alice');
    expect(guard.isLocked('alice')).toBe(false);

    // The counter was wiped, so it takes a fresh run of 15 to re-lock.
    for (let i = 0; i < 14; i++) expect(guard.onFail('alice')).toBe(false);
    expect(guard.onFail('alice')).toBe(true);
  });

  it('the lock expires 30 minutes after it is set', async () => {
    const { createLockoutGuard } = await loadRl();
    vi.useFakeTimers();
    const T0 = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(T0);

    const guard = createLockoutGuard();
    for (let i = 0; i < 15; i++) guard.onFail('bob');
    expect(guard.isLocked('bob')).toBe(true);

    // Just before expiry: still locked.
    vi.setSystemTime(T0 + 30 * 60 * 1000 - 1);
    expect(guard.isLocked('bob')).toBe(true);
    // Past 30 minutes: lock has lapsed.
    vi.setSystemTime(T0 + 30 * 60 * 1000 + 1);
    expect(guard.isLocked('bob')).toBe(false);
  });

  it('onFail with an empty/undefined/null username is a no-op (AC3)', async () => {
    const { createLockoutGuard } = await loadRl();
    const guard = createLockoutGuard();

    expect(guard.onFail('')).toBe(false);
    expect(guard.onFail(undefined)).toBe(false);
    expect(guard.onFail(null)).toBe(false);

    // Calling it repeatedly never writes a row, so the empty key never locks.
    for (let i = 0; i < 20; i++) guard.onFail('');
    expect(guard.isLocked('')).toBe(false);
  });
});

describe('createLoginLimiter (AC4)', () => {
  it('returns 429 once the configured max (25) is exceeded from one IP', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = miniApp(createLoginLimiter(), () => 401);

    for (let i = 1; i <= 25; i++) {
      const r = await request(app).post('/login');
      expect(r.status).toBe(401);
    }
    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many login attempts/i);
  });

  // KNOWN DIVERGENCE (pinned, not fixed here): createLoginLimiter sets
  // `skipSuccessfulRequests: true`, but SqliteStore.decrement() is a no-op, so
  // the post-response decrement that would "uncount" a 2xx never happens.
  // Result: successful logins count toward the limit just like failures, and a
  // 26th request is blocked even when every prior request returned 200. The
  // AC's intended "a 2xx does not count" is therefore NOT the current behavior.
  // This test asserts the real behavior so the divergence is captured; flipping
  // it requires implementing SqliteStore.decrement (follow-up fix ticket).
  it('successful (2xx) responses still count — skipSuccessfulRequests is ineffective', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = miniApp(createLoginLimiter(), () => 200);

    const statuses = [];
    for (let i = 0; i < 26; i++) {
      statuses.push((await request(app).post('/login')).status);
    }
    expect(statuses.slice(0, 25)).toEqual(Array(25).fill(200));
    expect(statuses[25]).toBe(429);
  });
});

describe('RATE_LIMIT_DISABLED escape hatch (AC5)', () => {
  it('disables the limiter only for the exact string "true"', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = miniApp(createLoginLimiter(), () => 401);
    process.env.RATE_LIMIT_DISABLED = 'true';

    // Far past the max — the limiter is skipped entirely, so never 429.
    for (let i = 0; i < 40; i++) {
      const r = await request(app).post('/login');
      expect(r.status).toBe(401);
    }
  });

  it('any non-"true" value (false, 1, TRUE, yes, empty) leaves the limiter active', async () => {
    for (const v of ['false', '1', 'TRUE', 'yes', '']) {
      const { createLoginLimiter } = await loadRl();
      const app = miniApp(createLoginLimiter(), () => 401);
      process.env.RATE_LIMIT_DISABLED = v;

      let blocked = false;
      for (let i = 0; i < 30; i++) {
        if ((await request(app).post('/login')).status === 429) { blocked = true; break; }
      }
      expect(blocked, `value ${JSON.stringify(v)} must NOT disable the limiter`).toBe(true);
    }
  });

  it('buckets and lockouts persist across a simulated process restart (file-backed DB)', async () => {
    const dbPath = path.join(tmp, 'rl.db');

    let rl = await loadRl({ dbPath });
    const store1 = new rl.SqliteStore(60_000);
    await store1.increment('login:1.2.3.4');
    await store1.increment('login:1.2.3.4');
    const guard1 = rl.createLockoutGuard();
    for (let i = 0; i < 15; i++) guard1.onFail('carol');
    expect(guard1.isLocked('carol')).toBe(true);

    // Restart: drop the module cache and re-open the same DB file.
    rl = await loadRl({ dbPath });
    const store2 = new rl.SqliteStore(60_000);
    expect((await store2.increment('login:1.2.3.4')).totalHits).toBe(3); // bucket survived
    const guard2 = rl.createLockoutGuard();
    expect(guard2.isLocked('carol')).toBe(true); // lockout survived
  });
});
