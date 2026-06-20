import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// HLCE-213: session lifecycle & refresh-token rotation.
// server/db.js opens its DB at import time from DB_PATH, and server/sessions.js
// runs CREATE TABLE IF NOT EXISTS at import. We set DB_PATH=':memory:' BEFORE
// importing and reset modules between tests so each test gets a fresh in-memory
// DB and a fresh sessions table. Dynamic import() is required so the env var is
// in place before db.js evaluates it.
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

describe('server/sessions', () => {
  let sessions;
  let db;

  beforeEach(async () => {
    vi.resetModules();
    process.env.DB_PATH = ':memory:';
    db = (await import('./db.js')).db;
    sessions = await import('./sessions.js');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC: createSession stores only sha256(refresh) (never plaintext), expiry ~14d.
  describe('createSession', () => {
    it('returns a jti and a refresh token, stores only the sha256 hash (never plaintext)', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1', userAgent: 'UA', ip: '1.2.3.4' });
      expect(jti).toMatch(/^[0-9a-f]{32}$/);
      expect(typeof refresh).toBe('string');
      expect(refresh.length).toBeGreaterThan(0);

      const row = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(row).toBeTruthy();
      // The stored hash is sha256(refresh), and the plaintext is NOT stored.
      expect(row.refresh_hash).toBe(sha256(refresh));
      expect(row.refresh_hash).not.toBe(refresh);
      const dump = JSON.stringify(row);
      expect(dump).not.toContain(refresh);
    });

    it('sets expiry ~14 days out and records user_agent/ip/timestamps', () => {
      const before = Date.now();
      const { jti } = sessions.createSession({ userId: 'u1', userAgent: 'UA', ip: '1.2.3.4' });
      const after = Date.now();
      const row = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(row.user_id).toBe('u1');
      expect(row.user_agent).toBe('UA');
      expect(row.ip).toBe('1.2.3.4');
      expect(row.created_at).toBeGreaterThanOrEqual(before);
      expect(row.created_at).toBeLessThanOrEqual(after);
      expect(row.last_seen_at).toBe(row.created_at);
      expect(row.expires_at - row.created_at).toBe(REFRESH_TTL_MS);
      expect(row.revoked_at).toBeNull();
    });

    it('persists null for missing user_agent/ip', () => {
      const { jti } = sessions.createSession({ userId: 'u1' });
      const row = db.prepare('SELECT user_agent, ip FROM sessions WHERE jti = ?').get(jti);
      expect(row.user_agent).toBeNull();
      expect(row.ip).toBeNull();
    });
  });

  // AC: isJtiActive true for fresh, false after revoke, false for unknown jti.
  describe('isJtiActive', () => {
    it('is true for a freshly created session', () => {
      const { jti } = sessions.createSession({ userId: 'u1' });
      expect(sessions.isJtiActive(jti)).toBe(true);
    });

    it('is false for an unknown jti', () => {
      expect(sessions.isJtiActive('deadbeef')).toBe(false);
    });

    it('is false after revokeSession', () => {
      const { jti } = sessions.createSession({ userId: 'u1' });
      sessions.revokeSession(jti);
      expect(sessions.isJtiActive(jti)).toBe(false);
    });

    // AC: expiry — manipulate the row to make it expired, assert isJtiActive false.
    it('is false once the session is past its expiry (direct row manipulation)', () => {
      const { jti } = sessions.createSession({ userId: 'u1' });
      db.prepare('UPDATE sessions SET expires_at = ? WHERE jti = ?').run(Date.now() - 1000, jti);
      expect(sessions.isJtiActive(jti)).toBe(false);
    });

    // AC: expiry via fake timers — advance clock past the 14d TTL.
    it('is false once the clock advances past the 14d TTL (fake timers)', () => {
      vi.useFakeTimers();
      const { jti } = sessions.createSession({ userId: 'u1' });
      expect(sessions.isJtiActive(jti)).toBe(true);
      vi.advanceTimersByTime(REFRESH_TTL_MS + 1000);
      expect(sessions.isJtiActive(jti)).toBe(false);
    });
  });

  // AC: rotateRefresh with CORRECT refresh returns a NEW token; OLD no longer rotates.
  describe('rotateRefresh — happy path', () => {
    it('returns a new refresh token and the old token no longer rotates', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1' });
      const newRefresh = sessions.rotateRefresh(jti, refresh, 'UA2', '9.9.9.9');
      expect(newRefresh).toBeTruthy();
      expect(newRefresh).not.toBe(refresh);

      // Stored hash now matches the NEW token, not the old one.
      const row = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(row.refresh_hash).toBe(sha256(newRefresh));
      expect(row.refresh_hash).not.toBe(sha256(refresh));

      // The OLD token is now a wrong refresh -> rotation fails (returns null).
      const replay = sessions.rotateRefresh(jti, refresh, 'UA2', '9.9.9.9');
      expect(replay).toBeNull();

      // Session is still active enough to rotate with the NEW token... except the
      // failed replay above triggers the reuse-revocation guard. So after replay
      // the session is revoked (covered in the reuse test). Here we verify the
      // first rotation updated last_seen_at / ua / ip.
    });

    it('updates last_seen_at, user_agent and ip on successful rotation', () => {
      vi.useFakeTimers();
      const { jti, refresh } = sessions.createSession({ userId: 'u1', userAgent: 'OLD', ip: '1.1.1.1' });
      const created = db.prepare('SELECT last_seen_at FROM sessions WHERE jti = ?').get(jti).last_seen_at;
      vi.advanceTimersByTime(5000);
      const newRefresh = sessions.rotateRefresh(jti, refresh, 'NEW', '2.2.2.2');
      expect(newRefresh).toBeTruthy();
      const row = db.prepare('SELECT last_seen_at, user_agent, ip FROM sessions WHERE jti = ?').get(jti);
      expect(row.last_seen_at).toBe(created + 5000);
      expect(row.user_agent).toBe('NEW');
      expect(row.ip).toBe('2.2.2.2');
    });

    it('the NEW token rotates again (chained rotation)', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1' });
      const r2 = sessions.rotateRefresh(jti, refresh);
      expect(r2).toBeTruthy();
      const r3 = sessions.rotateRefresh(jti, r2);
      expect(r3).toBeTruthy();
      expect(r3).not.toBe(r2);
    });
  });

  // AC (MOST IMPORTANT): rotateRefresh with a WRONG refresh returns null AND
  // revokes the whole session (reuse-revocation guard).
  describe('rotateRefresh — reuse-revocation guard', () => {
    it('returns null and revokes the session when a wrong refresh is presented', () => {
      const { jti } = sessions.createSession({ userId: 'u1' });
      expect(sessions.isJtiActive(jti)).toBe(true);

      const result = sessions.rotateRefresh(jti, 'totally-wrong-refresh-token');
      expect(result).toBeNull();

      // The guard must have revoked the session.
      expect(sessions.isJtiActive(jti)).toBe(false);
      const row = db.prepare('SELECT revoked_at FROM sessions WHERE jti = ?').get(jti);
      expect(row.revoked_at).toBeTruthy();
    });

    it('replaying a stale (already-rotated) refresh revokes the session', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1' });
      const newRefresh = sessions.rotateRefresh(jti, refresh);
      expect(newRefresh).toBeTruthy();
      expect(sessions.isJtiActive(jti)).toBe(true);

      // Attacker (or stale client) replays the OLD refresh -> wrong hash -> revoke.
      const replay = sessions.rotateRefresh(jti, refresh);
      expect(replay).toBeNull();
      expect(sessions.isJtiActive(jti)).toBe(false);

      // Even the legitimately-issued new token can no longer rotate (session dead).
      expect(sessions.rotateRefresh(jti, newRefresh)).toBeNull();
    });
  });

  // AC: rotateRefresh on revoked/expired/unknown jti returns null with no mutation.
  describe('rotateRefresh — revoked / expired / unknown', () => {
    it('returns null for an unknown jti and creates no row', () => {
      expect(sessions.rotateRefresh('nope', 'x')).toBeNull();
      const count = db.prepare('SELECT COUNT(*) c FROM sessions').get().c;
      expect(count).toBe(0);
    });

    it('returns null for an already-revoked jti without mutating the row', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1' });
      sessions.revokeSession(jti);
      const before = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);

      // Even presenting the CORRECT refresh must return null and not rotate.
      expect(sessions.rotateRefresh(jti, refresh)).toBeNull();
      const after = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(after.refresh_hash).toBe(before.refresh_hash);
      expect(after.revoked_at).toBe(before.revoked_at);
      expect(after.last_seen_at).toBe(before.last_seen_at);
    });

    it('returns null for an expired jti without mutating the row', () => {
      const { jti, refresh } = sessions.createSession({ userId: 'u1' });
      db.prepare('UPDATE sessions SET expires_at = ? WHERE jti = ?').run(Date.now() - 1000, jti);
      const before = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(sessions.rotateRefresh(jti, refresh)).toBeNull();
      const after = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
      expect(after.refresh_hash).toBe(before.refresh_hash);
      expect(after.revoked_at).toBe(before.revoked_at);
      expect(after.last_seen_at).toBe(before.last_seen_at);
    });
  });

  // AC: revokeAllForUser(except) behavior.
  describe('revokeAllForUser', () => {
    it('revokes every session for the user when no exception is given', () => {
      const a = sessions.createSession({ userId: 'u1' });
      const b = sessions.createSession({ userId: 'u1' });
      const other = sessions.createSession({ userId: 'u2' });

      sessions.revokeAllForUser('u1');

      expect(sessions.isJtiActive(a.jti)).toBe(false);
      expect(sessions.isJtiActive(b.jti)).toBe(false);
      // A different user is untouched.
      expect(sessions.isJtiActive(other.jti)).toBe(true);
    });

    it('keeps the excepted session active and revokes the rest (logout-others)', () => {
      const keep = sessions.createSession({ userId: 'u1' });
      const a = sessions.createSession({ userId: 'u1' });
      const b = sessions.createSession({ userId: 'u1' });

      sessions.revokeAllForUser('u1', keep.jti);

      expect(sessions.isJtiActive(keep.jti)).toBe(true);
      expect(sessions.isJtiActive(a.jti)).toBe(false);
      expect(sessions.isJtiActive(b.jti)).toBe(false);
    });
  });

  // AC: listForUser never selects the refresh hash and caps at 100.
  describe('listForUser', () => {
    it('never exposes the refresh_hash column', () => {
      const { jti } = sessions.createSession({ userId: 'u1', userAgent: 'UA', ip: '1.2.3.4' });
      const list = sessions.listForUser('u1');
      expect(list.length).toBe(1);
      expect(list[0].jti).toBe(jti);
      expect(list[0]).not.toHaveProperty('refresh_hash');
      // sanity: the safe columns ARE present
      expect(list[0]).toHaveProperty('created_at');
      expect(list[0]).toHaveProperty('expires_at');
    });

    it('caps the result at 100 rows, newest (last_seen_at desc) first', () => {
      const insert = db.prepare(
        'INSERT INTO sessions (jti, user_id, refresh_hash, created_at, last_seen_at, expires_at) VALUES (?,?,?,?,?,?)'
      );
      const now = Date.now();
      for (let i = 0; i < 150; i++) {
        insert.run(`jti${i}`, 'u1', 'hash', now, now + i, now + REFRESH_TTL_MS);
      }
      const list = sessions.listForUser('u1');
      expect(list.length).toBe(100);
      // ordered by last_seen_at DESC -> the highest last_seen_at (i=149) is first.
      expect(list[0].jti).toBe('jti149');
      expect(list[0].last_seen_at).toBeGreaterThan(list[99].last_seen_at);
    });

    it('returns only the requested user\'s sessions', () => {
      sessions.createSession({ userId: 'u1' });
      sessions.createSession({ userId: 'u2' });
      expect(sessions.listForUser('u1').length).toBe(1);
      expect(sessions.listForUser('u2').length).toBe(1);
      expect(sessions.listForUser('nobody').length).toBe(0);
    });
  });

  // revokeSession is idempotent and does not clobber the original revoke time.
  describe('revokeSession', () => {
    it('is idempotent — a second revoke does not change revoked_at', () => {
      vi.useFakeTimers();
      const { jti } = sessions.createSession({ userId: 'u1' });
      sessions.revokeSession(jti);
      const first = db.prepare('SELECT revoked_at FROM sessions WHERE jti = ?').get(jti).revoked_at;
      vi.advanceTimersByTime(10000);
      sessions.revokeSession(jti);
      const second = db.prepare('SELECT revoked_at FROM sessions WHERE jti = ?').get(jti).revoked_at;
      expect(second).toBe(first);
    });
  });
});
