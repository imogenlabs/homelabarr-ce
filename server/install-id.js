import crypto from 'node:crypto';
import { db } from './db.js';
import { isDemoMode } from './demo-mode.js';

db.exec('CREATE TABLE IF NOT EXISTS install_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

// One random id per install, made on first use and kept in the database. Usage
// analytics count installs by it; it says nothing about who or where the
// install is. The public demo is rebuilt every 30 minutes, so it reports one
// fixed id rather than looking like a new install each time.
export function getInstallId() {
  if (isDemoMode()) return 'demo';
  db.prepare('INSERT OR IGNORE INTO install_meta (key, value) VALUES (?, ?)').run('install_id', crypto.randomUUID());
  return db.prepare('SELECT value FROM install_meta WHERE key = ?').get('install_id').value;
}
