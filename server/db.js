import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';
import { readSecret } from './secrets.js';

const DB_PATH = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'homelabarr.db');

function open() {
  const key = readSecret('SQLCIPHER_KEY', { required: false });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  if (key && key.length >= 32) {
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
  return db;
}

export const db = open();
