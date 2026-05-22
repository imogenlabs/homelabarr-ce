import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'sessions.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    jti TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_hash TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at);
`);

const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function createSession({ userId, userAgent, ip }) {
  const jti = crypto.randomBytes(16).toString('hex');
  const refresh = crypto.randomBytes(32).toString('base64url');
  const refreshHash = crypto.createHash('sha256').update(refresh).digest('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (jti, user_id, refresh_hash, user_agent, ip, created_at, last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(jti, userId, refreshHash, userAgent || null, ip || null, now, now, now + REFRESH_TTL_MS);
  return { jti, refresh };
}

export function isJtiActive(jti) {
  const row = db.prepare('SELECT revoked_at, expires_at FROM sessions WHERE jti = ?').get(jti);
  if (!row) return false;
  if (row.revoked_at) return false;
  if (row.expires_at < Date.now()) return false;
  return true;
}

export function getSessionByJti(jti) {
  return db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti) || null;
}

export function rotateRefresh(jti, presentedRefresh, userAgent, ip) {
  const row = db.prepare('SELECT * FROM sessions WHERE jti = ?').get(jti);
  if (!row || row.revoked_at || row.expires_at < Date.now()) return null;
  const presentedHash = crypto.createHash('sha256').update(presentedRefresh).digest('hex');
  const a = Buffer.from(row.refresh_hash, 'hex');
  const b = Buffer.from(presentedHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE jti = ?').run(Date.now(), jti);
    return null;
  }
  const newRefresh = crypto.randomBytes(32).toString('base64url');
  const newRefreshHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
  db.prepare('UPDATE sessions SET refresh_hash = ?, last_seen_at = ?, user_agent = ?, ip = ? WHERE jti = ?')
    .run(newRefreshHash, Date.now(), userAgent || row.user_agent, ip || row.ip, jti);
  return newRefresh;
}

export function revokeSession(jti) {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE jti = ? AND revoked_at IS NULL').run(Date.now(), jti);
}

export function revokeAllForUser(userId, exceptJti = null) {
  if (exceptJti) {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND jti != ? AND revoked_at IS NULL').run(Date.now(), userId, exceptJti);
  } else {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(Date.now(), userId);
  }
}

export function listForUser(userId) {
  return db.prepare('SELECT jti, user_agent, ip, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 100').all(userId);
}

setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)').run(Date.now(), Date.now() - 7 * 24 * 60 * 60 * 1000);
}, 60 * 60 * 1000).unref();
