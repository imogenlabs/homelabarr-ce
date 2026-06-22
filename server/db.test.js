import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-221 / HLCE-256: SQLCipher open contract. db.js opens DB_PATH at import,
// reading the key via readSecret('SQLCIPHER_KEY'). Each test resets modules,
// points DB_PATH at a throwaway file, and SECRET_ROOT at a non-existent dir so
// only the env key is used.
// A plaintext SQLite file begins with the magic string "SQLite format 3\0".
// Match on the prefix to stay agnostic about the trailing NUL byte.
const SQLITE_MAGIC_PREFIX = 'SQLite format 3';
let tmp, dbPath;

async function loadDb(key, dbPathOverride) {
  vi.resetModules();
  dbPath = dbPathOverride || path.join(tmp, `db-${Math.abs(hash(key || 'none'))}.db`);
  process.env.DB_PATH = dbPath;
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
  if (key === undefined) delete process.env.SQLCIPHER_KEY;
  else process.env.SQLCIPHER_KEY = key;
  return import('./db.js');
}

// Tiny deterministic label helper (Math.random is unavailable in some envs).
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function fileHeader(p) {
  return fs.readFileSync(p).subarray(0, 16).toString('latin1');
}

// Track opened handles so WAL file connections are closed before the dir is
// removed — leaked native handles otherwise crash the fork worker on teardown.
let openHandles = [];

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-db-'));
  openHandles = [];
});

afterEach(() => {
  for (const h of openHandles) { try { h.close(); } catch { /* already closed */ } }
  openHandles = [];
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const k of ['DB_PATH', 'SECRET_ROOT', 'SQLCIPHER_KEY']) delete process.env[k];
});

describe('SQLCipher encryption-at-rest (AC1 / HLCE-256)', () => {
  it('round-trips a fresh encrypted DB and writes a ciphertext (non-plaintext) header', async () => {
    const { db } = await loadDb('k'.repeat(40)); // >= 32 chars → cipher engaged
    openHandles.push(db);
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
    db.prepare('INSERT INTO t (v) VALUES (?)').run('secret-value');
    expect(db.prepare('SELECT v FROM t WHERE id = 1').get().v).toBe('secret-value');

    // Encrypted DB: even the 16-byte header is ciphertext, not the magic string.
    expect(fileHeader(dbPath).startsWith(SQLITE_MAGIC_PREFIX)).toBe(false);
  });

  it('reopens an existing encrypted DB with the correct key and rejects a wrong key', async () => {
    const key = 'k'.repeat(40);
    const file = path.join(tmp, 'enc.db');

    let mod = await loadDb(key, file);
    openHandles.push(mod.db);
    mod.db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
    mod.db.prepare('INSERT INTO t (v) VALUES (?)').run('persisted');
    mod.db.close(); // flush + release the WAL before reopening the same file

    // Correct key → data survives the reopen.
    mod = await loadDb(key, file);
    openHandles.push(mod.db);
    expect(mod.db.prepare('SELECT v FROM t WHERE id = 1').get().v).toBe('persisted');

    // Wrong (but valid-length) key on the encrypted file → the verify SELECT throws.
    await expect(loadDb('w'.repeat(40), file)).rejects.toThrow(/not a database|SQLCipher key invalid/i);
  });

  it('FAILS CLOSED when the key is under 32 chars instead of silently writing plaintext (HLCE-282)', async () => {
    // REGRESSION (HLCE-282): a non-empty SQLCIPHER_KEY under 32 chars used to be
    // silently ignored — the DB was written in PLAINTEXT while the operator
    // believed it was encrypted (a silent encryption downgrade). open() must now
    // throw a clear, actionable error rather than open the file at all.
    await expect(loadDb('too-short-key')).rejects.toThrow(/too short.*32|Refusing to open the database in PLAINTEXT/i);
  });

  it('gives a clear diagnostic when opening an existing encrypted DB with NO key (HLCE-282)', async () => {
    // Create an encrypted DB first, then reopen it with no key configured. The
    // old code hit a cryptic WAL "file is not a database" error; open() must now
    // translate that into a "missing/invalid key for an existing encrypted DB"
    // diagnostic.
    const key = 'k'.repeat(40);
    const file = path.join(tmp, 'enc-nokey.db');
    let mod = await loadDb(key, file);
    openHandles.push(mod.db);
    mod.db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
    mod.db.prepare('INSERT INTO t (v) VALUES (?)').run('persisted');
    mod.db.close();

    await expect(loadDb(undefined, file)).rejects.toThrow(/encryption key|encrypted database/i);
  });

  it('opens unencrypted when no key is configured (fresh DB)', async () => {
    const { db } = await loadDb(undefined);
    openHandles.push(db);
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)');
    expect(fileHeader(dbPath).startsWith(SQLITE_MAGIC_PREFIX)).toBe(true);
  });
});
