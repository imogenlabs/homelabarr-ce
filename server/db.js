import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';
import { readSecret } from './secrets.js';

const DB_PATH = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'homelabarr.db');

function open() {
  const key = readSecret('SQLCIPHER_KEY', { required: false });
  // Fail closed on a short key. A non-empty SQLCIPHER_KEY under 32 chars used to
  // be silently ignored, so the DB was written in PLAINTEXT while the operator
  // believed it was encrypted — a silent encryption downgrade. SQLCipher needs a
  // strong key; refuse to start rather than write secrets unencrypted (HLCE-282).
  if (key && key.length < 32) {
    throw new Error(
      `SQLCIPHER_KEY is set but too short (${key.length} chars; needs >= 32). ` +
      'Refusing to open the database in PLAINTEXT — set a 32+ char key or unset it.'
    );
  }
  const db = new Database(DB_PATH);
  // The SQLCipher key MUST be applied before any other statement touches the
  // file. journal_mode=WAL writes the database header, so running it first would
  // initialise a fresh file as plaintext and the subsequent key application then
  // fails with "file is not a database" (HLCE-256). Key first, then WAL.
  if (key) {
    db.pragma(`cipher='sqlcipher'`);
    db.pragma(`key='${key.replace(/'/g, "''")}'`);
    db.pragma(`cipher_page_size=4096`);
    try {
      db.prepare('SELECT count(*) FROM sqlite_master').get();
    } catch (e) {
      // Throw (not process.exit) so the failure is catchable in tests and by
      // callers; in production an uncaught throw at import still aborts startup.
      throw new Error(`SQLCipher key invalid or DB not encrypted: ${e.message}`);
    }
  }
  try {
    db.pragma('journal_mode = WAL');
  } catch (e) {
    // Reaching WAL with no key applied means we opened the file as plaintext. If
    // the file is actually an existing ENCRYPTED database, this is where SQLite
    // first reads the header and throws a cryptic "file is not a database" /
    // malformed error. Translate it into an actionable diagnostic (HLCE-282).
    if (!key) {
      throw new Error(
        'Failed to open the database without an encryption key. If this is an ' +
        'existing encrypted database, SQLCIPHER_KEY is missing or invalid ' +
        `(needs the original 32+ char key). Underlying error: ${e.message}`
      );
    }
    throw e;
  }
  return db;
}

export const db = open();
