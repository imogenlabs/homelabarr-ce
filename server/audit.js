import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { db } from './db.js';

const AUDIT_DIR = process.env.AUDIT_DIR || path.join(process.cwd(), 'server', 'activity-data');

let auditLogger = null;

export function initAudit() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ts         TEXT    NOT NULL,
      actor      TEXT,
      ip         TEXT,
      event      TEXT    NOT NULL,
      target     TEXT,
      result     TEXT    NOT NULL,
      meta_json  TEXT,
      prev_hash  TEXT    NOT NULL,
      row_hash   TEXT    NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS idx_audit_event_ts ON audit_events (event, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_actor_ts ON audit_events (actor, ts);
  `);

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const rotator = new DailyRotateFile({
    filename: path.join(AUDIT_DIR, 'audit-%DATE%.jsonl'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '90d',
    zippedArchive: true,
  });
  auditLogger = winston.createLogger({ transports: [rotator], format: winston.format.json() });
}

const REDACT = /^(authorization|cookie|set-cookie|password|passcode|secret|token|x-csrf-token|x-api-key|jwt_secret)$/i;
function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT.test(k) ? '[REDACTED]' : (typeof v === 'object' ? redact(v) : v);
  }
  return out;
}

// Frame the chained fields unambiguously before hashing. A delimiter-less
// `.join('')` left adjacent fields with no boundary, so shifting a character
// across e.g. the actor/event boundary produced the same concatenation and
// therefore the same hash — a tamper that verifyChain could not detect
// (HLCE-257). JSON.stringify quotes and escapes each field, so every field
// boundary is unambiguous. audit() and verifyChain() MUST use this identically.
function hashAuditRow({ ts, actor, ip, event, target, result, meta_json, prev_hash }) {
  return crypto.createHash('sha256').update(
    JSON.stringify([ts, actor || '', ip || '', event, target || '', result, meta_json, prev_hash])
  ).digest('hex');
}

export function audit(evt) {
  if (!db) return null;
  const ts = new Date().toISOString();
  const meta_json = JSON.stringify(redact(evt.meta) || {});
  const prev = db.prepare('SELECT row_hash FROM audit_events ORDER BY id DESC LIMIT 1').get();
  const prev_hash = prev ? prev.row_hash : '0'.repeat(64);
  const row_hash = hashAuditRow({
    ts, actor: evt.actor, ip: evt.ip, event: evt.event,
    target: evt.target, result: evt.result, meta_json, prev_hash,
  });
  const row = { ts, actor: evt.actor || null, ip: evt.ip || null, event: evt.event,
                target: evt.target || null, result: evt.result, meta_json, prev_hash, row_hash };
  db.prepare(`INSERT INTO audit_events (ts, actor, ip, event, target, result, meta_json, prev_hash, row_hash)
             VALUES (@ts, @actor, @ip, @event, @target, @result, @meta_json, @prev_hash, @row_hash)`).run(row);
  if (auditLogger) auditLogger.info(row);
  return row_hash;
}

export function verifyChain() {
  if (!db) return { ok: true, rows: 0 };
  let expected = '0'.repeat(64);
  const rows = db.prepare('SELECT * FROM audit_events ORDER BY id ASC').all();
  for (const r of rows) {
    if (r.prev_hash !== expected) return { ok: false, brokenAt: r.id, kind: 'prev_hash_mismatch' };
    const recomputed = hashAuditRow(r);
    if (recomputed !== r.row_hash) return { ok: false, brokenAt: r.id, kind: 'row_hash_mismatch' };
    expected = r.row_hash;
  }
  return { ok: true, rows: rows.length };
}

export function getRecentAuditEvents(limit = 200) {
  if (!db) return [];
  return db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(Math.min(limit, 1000));
}

const ALLOWED_EVENTS = new Set([
  'login.success', 'login.fail', 'login.locked', 'login.ratelimited',
  'session.revoke', 'session.revoke_all', 'session.refresh',
  'auth.cli_mint', 'auth.cli_mint.deny',
  'audit.read', 'audit.chain.verified', 'audit.chain.broken', 'audit.cipher.activated',
  'backup.completed', 'backup.failed',
  'restore.drill.completed', 'restore.drill.failed',
  'key.rotation.completed', 'key.rotation.failed',
  'ip.denied',
]);

export function eventAllowed(event) {
  return typeof event === 'string' && ALLOWED_EVENTS.has(event);
}
