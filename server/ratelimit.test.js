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
//
// HLCE-263 mutation pass: score 83.52% -> 97.80%. The 2 remaining survivors are
// EQUIVALENT mutants, both on createLoginLimiter's `windowMs: 15 * 60 * 1000`
// (ratelimit.js:47). express-rate-limit only uses its own `windowMs` to compute
// the reset window when the store does NOT supply one; our SqliteStore (line 52)
// always returns an explicit `resetTime` from ITS own windowMs, so the limiter's
// `windowMs` config is inert — changing it (verified empirically) does not move
// the RateLimit-Reset header or any limiting behaviour. The store's windowMs is
// the one under test (asserted via the reset header + resetTime above).
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

  it('sweeps expired buckets on the 60s cleanup interval (HLCE-263)', async () => {
    // Pins the setInterval cleanup body + its 60_000ms period. The DELETE only
    // fires once the timer elapses; advancing fake time by <60s must NOT sweep,
    // by 60s MUST sweep the expired bucket (and leave a live one alone).
    const { SqliteStore } = await loadRl();
    vi.useFakeTimers();
    const T0 = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(T0);

    // A long window so the "live" bucket outlasts the 60s sweep; the expired
    // bucket is written directly with a reset_at already in the past.
    const store = new SqliteStore(10 * 60 * 1000);
    await store.increment('still-live'); // reset_at = T0 + 600_000
    store.db.prepare('INSERT OR REPLACE INTO rate_buckets (key, hits, reset_at) VALUES (?,?,?)')
      .run('expired', 1, T0 - 1); // already past

    const count = () => store.db.prepare('SELECT COUNT(*) c FROM rate_buckets').get().c;
    expect(count()).toBe(2);

    // Just under the 60s interval: cleanup has not run yet.
    vi.setSystemTime(T0 + 59_000);
    vi.advanceTimersByTime(59_000);
    expect(count()).toBe(2);

    // Cross the 60s boundary: the interval fires and sweeps reset_at < now.
    vi.setSystemTime(T0 + 60_000);
    vi.advanceTimersByTime(1_000);
    // 'expired' (reset_at T0-1) is gone; 'still-live' (T0+600_000) survives.
    expect(count()).toBe(1);
    expect(store.db.prepare("SELECT key FROM rate_buckets").get().key).toBe('still-live');
  });

  it('starts a fresh window when reset_at equals now exactly (strict <= boundary, HLCE-263)', async () => {
    const { SqliteStore } = await loadRl();
    vi.useFakeTimers();
    const T0 = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(T0);

    const store = new SqliteStore(1000);
    await store.increment('k'); // reset_at = T0 + 1000
    // Jump to exactly reset_at: `row.reset_at <= now` is true -> a NEW window
    // begins at hits=1. The `<` mutant would treat it as still-open -> hits=2.
    vi.setSystemTime(T0 + 1000);
    const r = await store.increment('k');
    expect(r.totalHits).toBe(1);
    expect(r.resetTime).toEqual(new Date(T0 + 1000 + 1000));
  });

  it('tracks keys independently; resetKey clears a bucket and decrement uncounts one hit', async () => {
    const { SqliteStore } = await loadRl();
    const store = new SqliteStore(60_000);

    await store.increment('a');
    await store.increment('a');
    await store.increment('b');
    expect((await store.increment('a')).totalHits).toBe(3);
    expect((await store.increment('b')).totalHits).toBe(2);

    // decrement() rolls back one hit on the named key (HLCE-255): a→3 becomes 2,
    // so the next increment lands on 3, not 4.
    await store.decrement('a');
    expect((await store.increment('a')).totalHits).toBe(3);

    await store.resetKey('a');
    expect((await store.increment('a')).totalHits).toBe(1);
    // resetKey only touches the named key.
    expect((await store.increment('b')).totalHits).toBe(3);
  });

  it('decrement is a no-op for a missing key and for an expired bucket (HLCE-263)', async () => {
    // Pins decrement()'s `if (!row || row.reset_at <= now) return;` guard.
    const { SqliteStore } = await loadRl();
    vi.useFakeTimers();
    const T0 = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(T0);
    const store = new SqliteStore(1000);

    // (a) Missing key: decrement must not create a row or throw. The next
    // increment therefore starts cleanly at 1. (Kills the `!row` removal.)
    await store.decrement('ghost');
    expect(store.db.prepare('SELECT COUNT(*) c FROM rate_buckets').get().c).toBe(0);

    // (b) Expired bucket: a stale row past its window must NOT be decremented
    // (the next hit will reset it anyway). Create a bucket, let it expire, then
    // decrement — its stored hit count must be untouched. (Kills the
    // `reset_at <= now` guard + the `||`->`&&` mutant.)
    await store.increment('stale'); // hits=1, reset_at = T0 + 1000
    vi.setSystemTime(T0 + 2000);    // now past reset_at
    await store.decrement('stale');
    const row = store.db.prepare('SELECT hits FROM rate_buckets WHERE key=?').get('stale');
    expect(row.hits).toBe(1); // unchanged: the guard returned before UPDATE

    // (c) Boundary: now === reset_at exactly. `reset_at <= now` is true, so the
    // bucket is treated as expired and decrement is a no-op. The `<` mutant
    // would fall through and decrement the still-counted hit.
    await store.increment('edge'); // hits=1, reset_at = T0 + 2000 + 1000
    vi.setSystemTime(T0 + 2000 + 1000); // exactly reset_at
    await store.decrement('edge');
    expect(store.db.prepare('SELECT hits FROM rate_buckets WHERE key=?').get('edge').hits).toBe(1);
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
    // Exactly at locked_until: the guard uses `locked_until > Date.now()`, so the
    // lock has just lapsed (not locked). The `>=` mutant would keep it locked.
    vi.setSystemTime(T0 + 30 * 60 * 1000);
    expect(guard.isLocked('bob')).toBe(false);
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

  // REGRESSION (HLCE-255): createLoginLimiter sets `skipSuccessfulRequests: true`,
  // and SqliteStore.decrement() now actually "uncounts" a 2xx after the response.
  // So a stream of successful logins from one IP never trips the limiter — the
  // per-request increment is rolled back once the 200 is sent. (Failures, which
  // are not skipped, still accumulate — covered by the 25-then-429 test above.)
  it('successful (2xx) responses do not count — skipSuccessfulRequests is effective', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = miniApp(createLoginLimiter(), () => 200);

    const statuses = [];
    for (let i = 0; i < 40; i++) {
      statuses.push((await request(app).post('/login')).status);
    }
    expect(statuses).toEqual(Array(40).fill(200));
    expect(statuses).not.toContain(429);
  });
});

describe('createLoginLimiter header + keying config (HLCE-263)', () => {
  it('emits standard RateLimit-* headers and suppresses the legacy X-RateLimit-* set', async () => {
    // Pins standardHeaders:true (49) and legacyHeaders:false (50). Use 401s so
    // requests actually count (skipSuccessfulRequests skips 2xx).
    const { createLoginLimiter } = await loadRl();
    const app = miniApp(createLoginLimiter(), () => 401);
    const r = await request(app).post('/login');
    // Standard draft headers present...
    expect(r.headers['ratelimit-limit'] ?? r.headers['ratelimit']).toBeDefined();
    // ...and the legacy headers absent.
    expect(r.headers['x-ratelimit-limit']).toBeUndefined();
    expect(r.headers['x-ratelimit-remaining']).toBeUndefined();
    // The reset window is ~15 minutes (900s). This pins the `15 * 60 * 1000`
    // windowMs arithmetic (47); the `15/60` / `15*60/1000` mutants would shrink
    // it to a sub-second window, so the reset header would round to ~0/1s.
    const reset = Number(r.headers['ratelimit-reset']);
    expect(reset).toBeGreaterThan(800);
    expect(reset).toBeLessThanOrEqual(900);
  });

  it('namespaces the limiter bucket key with the "login:" prefix (HLCE-263)', async () => {
    // Pins keyGenerator `'login:' + req.ip` (51). The limiter writes to the
    // shared db.rate_buckets table, so after a counted request the stored key
    // must literally start with 'login:'. The `'' + req.ip` mutant drops the
    // prefix, leaving a bare-IP key.
    const rl = await loadRl();
    const { db } = await import('./db.js');
    const app = miniApp(rl.createLoginLimiter(), () => 401);

    await request(app).post('/login');
    const keys = db.prepare('SELECT key FROM rate_buckets').all().map(r => r.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every(k => k.startsWith('login:'))).toBe(true);
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

// HLCE-307: the login limiter used to key on the exact client address
// (`'login:' + req.ip`). An IPv6 client is delegated a whole subnet and can
// rotate addresses inside it at will, so every attempt landed in a fresh
// bucket and the 25-per-15-minutes limit never bit. These tests drive real
// requests through the limiter from many source addresses.
//
// Source addresses are varied with X-Forwarded-For behind `trust proxy`, which
// is how req.ip is populated on the real deployment (the app sits behind
// Traefik). Without the fix, `ipv6Requests` below never sees a 429.
function proxiedApp(limiter, statusFor) {
  const app = express();
  app.set('trust proxy', true);
  app.post('/login', limiter, (_req, res) => res.status(statusFor()).json({}));
  return app;
}

// Fires `count` failed logins, each from a different address produced by
// `addressFor(i)`, and reports how many were rejected with a 429.
async function attemptsFrom(app, count, addressFor) {
  let blocked = 0;
  for (let i = 0; i < count; i++) {
    const r = await request(app).post('/login').set('X-Forwarded-For', addressFor(i));
    if (r.status === 429) blocked++;
  }
  return blocked;
}

describe('IPv6 subnet bucketing (HLCE-307)', () => {
  it('shares one bucket across addresses rotating within a single /64', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = proxiedApp(createLoginLimiter(), () => 401);
    const { db } = await import('./db.js');

    // 40 attempts, every one from a DIFFERENT address inside 2001:db8:: — the
    // exact rotation an attacker gets for free on IPv6. The limit is 25, so
    // the last 15 must be rejected.
    const blocked = await attemptsFrom(app, 40, (i) => `2001:db8::${(i + 1).toString(16)}`);
    expect(blocked).toBe(15);

    // ...and they landed in ONE bucket, not 40.
    const keys = db.prepare('SELECT key FROM rate_buckets').all().map(r => r.key);
    expect(keys).toEqual(['login:2001:db8::/56']);
  });

  it('keeps separate buckets for clients in different subnets', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = proxiedApp(createLoginLimiter(), () => 401);
    const { db } = await import('./db.js');

    // One attacker burns their whole allowance...
    expect(await attemptsFrom(app, 25, () => '2001:db8::1')).toBe(0);
    // ...which must not touch an unrelated client in another subnet.
    expect(await attemptsFrom(app, 1, () => '2001:db9::1')).toBe(0);

    const keys = db.prepare('SELECT key FROM rate_buckets').all().map(r => r.key).sort();
    expect(keys).toEqual(['login:2001:db8::/56', 'login:2001:db9::/56']);
  });

  it('leaves IPv4 bucketed per address, unchanged (25 per window)', async () => {
    const { createLoginLimiter } = await loadRl();
    const app = proxiedApp(createLoginLimiter(), () => 401);
    const { db } = await import('./db.js');

    // 30 attempts from one IPv4 address: 25 allowed, 5 blocked — the behaviour
    // that shipped before this fix.
    expect(await attemptsFrom(app, 30, () => '203.0.113.7')).toBe(5);
    // A different IPv4 address is a different client and keeps its own bucket:
    // no subnet aggregation is applied to IPv4.
    expect(await attemptsFrom(app, 1, () => '203.0.113.8')).toBe(0);

    const keys = db.prepare('SELECT key FROM rate_buckets').all().map(r => r.key).sort();
    expect(keys).toEqual(['login:203.0.113.7', 'login:203.0.113.8']);
  });
});

describe('ipSubnetKey (HLCE-307)', () => {
  it('collapses IPv6 to its subnet, passes IPv4 through, and tolerates a missing ip', async () => {
    const { ipSubnetKey } = await loadRl();
    // Two addresses in one /64 (and a third in the same /56) collapse together.
    expect(ipSubnetKey({ ip: '2001:db8::1' })).toBe('2001:db8::/56');
    expect(ipSubnetKey({ ip: '2001:db8::dead:beef' })).toBe('2001:db8::/56');
    expect(ipSubnetKey({ ip: '2001:db8:0:1::1' })).toBe('2001:db8::/56');
    // A different subnet stays distinct.
    expect(ipSubnetKey({ ip: '2001:db9::1' })).not.toBe('2001:db8::/56');
    // IPv4 is untouched, including the IPv4-mapped IPv6 form Node hands us on
    // a dual-stack socket.
    expect(ipSubnetKey({ ip: '203.0.113.7' })).toBe('203.0.113.7');
    expect(ipSubnetKey({ ip: '::ffff:203.0.113.7' })).toBe('203.0.113.7');
    // req.ip is undefined when Express cannot determine it; key rather than throw.
    expect(ipSubnetKey({})).toBe('');
  });
});
