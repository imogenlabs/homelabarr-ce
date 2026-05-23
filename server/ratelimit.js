import rateLimit from 'express-rate-limit';
import { db } from './db.js';

export class SqliteStore {
  constructor(windowMs) {
    this.db = db;
    this.windowMs = windowMs;
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_buckets (
        key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL
      );
    `);
    setInterval(() => {
      db.prepare('DELETE FROM rate_buckets WHERE reset_at < ?').run(Date.now());
    }, 60 * 1000).unref();
  }
  async increment(key) {
    const now = Date.now();
    const row = this.db.prepare('SELECT hits, reset_at FROM rate_buckets WHERE key=?').get(key);
    let hits, resetAt;
    if (!row || row.reset_at <= now) {
      hits = 1; resetAt = now + this.windowMs;
      this.db.prepare('INSERT OR REPLACE INTO rate_buckets (key, hits, reset_at) VALUES (?,?,?)').run(key, hits, resetAt);
    } else {
      hits = row.hits + 1; resetAt = row.reset_at;
      this.db.prepare('UPDATE rate_buckets SET hits=? WHERE key=?').run(hits, key);
    }
    return { totalHits: hits, resetTime: new Date(resetAt) };
  }
  async decrement() {}
  async resetKey(key) { this.db.prepare('DELETE FROM rate_buckets WHERE key=?').run(key); }
}

export function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => 'login:' + req.ip,
    store: new SqliteStore(15 * 60 * 1000),
    skipSuccessfulRequests: true,
    handler: (_req, res) => res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' }),
  });
}

export function createLockoutGuard() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_lockouts (
      username TEXT PRIMARY KEY, fail_count INTEGER NOT NULL DEFAULT 0, locked_until INTEGER
    );
  `);
  return {
    onFail(username) {
      if (!username) return false;
      const row = db.prepare('SELECT fail_count FROM account_lockouts WHERE username=?').get(username);
      const fc = (row?.fail_count || 0) + 1;
      const lockedUntil = fc >= 15 ? Date.now() + 30 * 60 * 1000 : null;
      db.prepare('INSERT OR REPLACE INTO account_lockouts (username, fail_count, locked_until) VALUES (?,?,?)').run(username, fc, lockedUntil);
      return !!lockedUntil;
    },
    onSuccess(username) {
      db.prepare('DELETE FROM account_lockouts WHERE username=?').run(username);
    },
    isLocked(username) {
      const r = db.prepare('SELECT locked_until FROM account_lockouts WHERE username=?').get(username);
      return !!(r?.locked_until && r.locked_until > Date.now());
    },
  };
}
