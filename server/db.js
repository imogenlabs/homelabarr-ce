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
      console.error('[fatal] SQLCipher key invalid or DB not encrypted:', e.message);
      process.exit(1);
    }
  }
  return db;
}

export const db = open();
