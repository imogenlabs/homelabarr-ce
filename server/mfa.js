import { TOTP, Secret } from 'otpauth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const MFA_FILE = path.join(process.cwd(), 'server', 'config', 'mfa.json');
const PENDING_FILE = path.join(process.cwd(), 'server', 'config', 'mfa-pending.json');

function loadMfa() {
  try { return JSON.parse(fs.readFileSync(MFA_FILE, 'utf8')); } catch { return {}; }
}
function saveMfa(data) {
  fs.writeFileSync(MFA_FILE, JSON.stringify(data, null, 2));
}
function loadPending() {
  try { return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')); } catch { return {}; }
}
function savePending(data) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
}

export function newTotp(username) {
  return new TOTP({
    issuer: 'HomelabARR',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new Secret({ size: 20 }),
  });
}

export function verifyTotp(secret, code) {
  const totp = new TOTP({
    issuer: 'HomelabARR',
    label: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.validate({ token: code, window: 1 }) !== null;
}

export function makeBackupCodes(n = 10) {
  return Array.from({ length: n }, () => crypto.randomBytes(5).toString('hex'));
}

export async function hashBackupCodes(codes) {
  return Promise.all(codes.map(c => bcrypt.hash(c, 12)));
}

export async function verifyBackupCode(code, hashes) {
  for (let i = 0; i < hashes.length; i++) {
    if (hashes[i] && await bcrypt.compare(code, hashes[i])) return i;
  }
  return -1;
}

export function getMfaForUser(userId) {
  return loadMfa()[userId] || null;
}

export function saveMfaForUser(userId, data) {
  const all = loadMfa();
  all[userId] = data;
  saveMfa(all);
}

export function disableMfaForUser(userId) {
  const all = loadMfa();
  delete all[userId];
  saveMfa(all);
}

export function setPendingMfa(userId, data) {
  const all = loadPending();
  all[userId] = data;
  savePending(all);
}

export function getPendingMfa(userId) {
  const all = loadPending();
  const entry = all[userId];
  if (!entry || entry.exp < Date.now()) return null;
  return entry;
}

export function clearPendingMfa(userId) {
  const all = loadPending();
  delete all[userId];
  savePending(all);
}
