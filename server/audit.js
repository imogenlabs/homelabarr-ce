import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { db } from './db.js';
import { REDACT_KEYS } from './log.js';

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
    -- Single-row chain tip (HLCE-269): an anchor so deleting the most recent
    -- rows (tail truncation) is detectable — the prev_hash walk alone leaves a
    -- truncated tail looking valid.
    CREATE TABLE IF NOT EXISTS audit_chain_tip (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      last_row_id   INTEGER NOT NULL,
      last_row_hash TEXT    NOT NULL,
      count         INTEGER NOT NULL
    );
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

// Reuse the single shared redaction list (server/log.js) so the encrypted audit
// sink and the structured logger redact the SAME keys. The old local list was
// anchored on `token` and missed refresh_token/access_token, leaking them into
// the persistent audit trail (HLCE-282).
function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT_KEYS.test(k) ? '[REDACTED]' : (typeof v === 'object' ? redact(v) : v);
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
  // The row INSERT and the chain-tip advance are two statements that MUST move
  // together — a crash between them would leave the tip disagreeing with the
  // table and verifyChain() would falsely report tail_truncated. Wrap both in a
  // single transaction so they commit atomically (HLCE-282).
  const writeRow = db.transaction((r) => {
    const info = db.prepare(`INSERT INTO audit_events (ts, actor, ip, event, target, result, meta_json, prev_hash, row_hash)
               VALUES (@ts, @actor, @ip, @event, @target, @result, @meta_json, @prev_hash, @row_hash)`).run(r);
    // Advance the chain tip so a later tail-truncation is detectable (HLCE-269).
    db.prepare(`INSERT INTO audit_chain_tip (id, last_row_id, last_row_hash, count)
                VALUES (1, @id, @hash, 1)
                ON CONFLICT(id) DO UPDATE SET last_row_id = @id, last_row_hash = @hash, count = count + 1`)
      .run({ id: info.lastInsertRowid, hash: r.row_hash });
  });
  writeRow(row);
  if (auditLogger) auditLogger.info(row);
  return row_hash;
}

export function verifyChain() {
  if (!db) return { ok: true, rows: 0 };
  let expected = '0'.repeat(64);
  const rows = db.prepare('SELECT * FROM audit_events ORDER BY id ASC').all();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.prev_hash !== expected) return { ok: false, brokenAt: r.id, kind: 'prev_hash_mismatch' };
    const recomputed = hashAuditRow(r);
    if (recomputed !== r.row_hash) return { ok: false, brokenAt: r.id, kind: 'row_hash_mismatch' };
    // Append-only ids are contiguous; a gap means a middle row was removed
    // (also caught by prev_hash above, but assert it explicitly).
    if (i > 0 && r.id !== rows[i - 1].id + 1) return { ok: false, brokenAt: r.id, kind: 'id_gap' };
    expected = r.row_hash;
  }

  // Tail-truncation check against the persisted chain tip (HLCE-269). Only
  // present once a row has been appended under this version; absent on a
  // legacy DB, in which case we skip (can't anchor what predates the tip).
  // NOTE: a fully DB-privileged attacker who also rewrites audit_chain_tip can
  // still defeat this — full protection needs an out-of-band/signed anchor.
  const tip = db.prepare('SELECT last_row_id, last_row_hash, count FROM audit_chain_tip WHERE id = 1').get();
  if (tip) {
    const last = rows.length ? rows[rows.length - 1] : null;
    const truncated =
      rows.length < tip.count ||
      (rows.length === tip.count && last && (last.id !== tip.last_row_id || last.row_hash !== tip.last_row_hash)) ||
      (tip.count > 0 && rows.length === 0);
    if (truncated) {
      return { ok: false, kind: 'tail_truncated', expectedCount: tip.count, actualCount: rows.length };
    }
  }

  return { ok: true, rows: rows.length };
}

export function getRecentAuditEvents(limit = 200) {
  if (!db) return [];
  return db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(Math.min(limit, 1000));
}
