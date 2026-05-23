import crypto from 'node:crypto';
import { readSecret } from './secrets.js';

const COOLDOWN_MS = 5 * 60 * 1000;
const lastSentByKey = new Map();
const ALLOWED_FIELDS = new Set(['event', 'actor', 'ip', 'user_agent', 'reason', 'count', 'window_seconds', 'severity']);

const ALERT_SECRET = readSecret('ALERT_WEBHOOK_SECRET', { required: false }) || '';
const ALERT_ON = new Set((process.env.ALERT_EVENTS || 'login.locked,audit.chain.broken,session.refresh.fail').split(','));

const ALERT_HOOK_URL = (() => {
  const raw = process.env.ALERT_WEBHOOK_URL || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && process.env.ALERT_WEBHOOK_ALLOW_INSECURE !== 'true') {
      console.error('[alert] ALERT_WEBHOOK_URL must be https (set ALERT_WEBHOOK_ALLOW_INSECURE=true for LAN-only http)');
      return '';
    }
    return u.toString();
  } catch {
    console.error('[alert] ALERT_WEBHOOK_URL is not a valid URL');
    return '';
  }
})();

let auditEventFn = null;
export function setAuditHook(fn) { auditEventFn = fn; }

export async function maybeAlert(payload) {
  if (!ALERT_HOOK_URL) return;
  if (!ALERT_ON.has(payload.event)) return;
  const key = payload.event + '|' + (payload.ip || 'anon');
  const now = Date.now();
  if ((lastSentByKey.get(key) || 0) > now - COOLDOWN_MS) return;
  lastSentByKey.set(key, now);
  const safe = Object.fromEntries(Object.entries(payload).filter(([k]) => ALLOWED_FIELDS.has(k)));
  const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json' };
  if (ALERT_SECRET) {
    headers['X-HomelabARR-Signature'] = 'sha256=' + crypto.createHmac('sha256', ALERT_SECRET).update(body).digest('hex');
  }
  try {
    const r = await fetch(ALERT_HOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(3000) });
    if (!r.ok && auditEventFn) {
      auditEventFn({ event: 'alert.webhook.failed', status: r.status, event_kind: payload.event });
    }
  } catch (err) {
    if (auditEventFn) {
      auditEventFn({ event: 'alert.webhook.error', message: (err.message || '').slice(0, 200), event_kind: payload.event });
    }
  }
}
