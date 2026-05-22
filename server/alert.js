import crypto from 'node:crypto';
import { readSecret } from './secrets.js';

const COOLDOWN_MS = 5 * 60 * 1000;
const lastSentByKey = new Map();

const ALERT_HOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const ALERT_SECRET = readSecret('ALERT_WEBHOOK_SECRET', { required: false }) || '';
const ALERT_ON = new Set((process.env.ALERT_EVENTS || 'login.locked,audit.chain.broken,session.refresh.fail').split(','));

export async function maybeAlert(payload) {
  if (!ALERT_HOOK_URL) return;
  if (!ALERT_ON.has(payload.event)) return;
  const key = payload.event + '|' + (payload.actor || payload.ip || 'anon');
  const now = Date.now();
  if ((lastSentByKey.get(key) || 0) > now - COOLDOWN_MS) return;
  lastSentByKey.set(key, now);
  const body = JSON.stringify({ ...payload, source: 'homelabarr-ce', ts: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json' };
  if (ALERT_SECRET) {
    headers['X-HomelabARR-Signature'] = 'sha256=' + crypto.createHmac('sha256', ALERT_SECRET).update(body).digest('hex');
  }
  try {
    await fetch(ALERT_HOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(3000) });
  } catch {}
}
