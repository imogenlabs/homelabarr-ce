import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// HLCE-217: HMAC-signed alert webhook. alert.js resolves the webhook URL,
// secret, and event allowlist at import, so each test resets modules and sets
// env first. fetch is stubbed; SECRET_ROOT points nowhere so the secret comes
// from env only.
let tmp;

async function loadAlert(env = {}) {
  vi.resetModules();
  for (const k of ['ALERT_WEBHOOK_URL', 'ALERT_WEBHOOK_SECRET', 'ALERT_EVENTS', 'ALERT_WEBHOOK_ALLOW_INSECURE']) {
    delete process.env[k];
  }
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
  Object.assign(process.env, env);
  return import('./alert.js');
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-alert-'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const k of ['ALERT_WEBHOOK_URL', 'ALERT_WEBHOOK_SECRET', 'ALERT_EVENTS', 'ALERT_WEBHOOK_ALLOW_INSECURE', 'SECRET_ROOT']) {
    delete process.env[k];
  }
});

describe('field allowlist & HMAC signing (AC4)', () => {
  it('posts only allowlisted fields and signs the body with HMAC when a secret is set', async () => {
    const alert = await loadAlert({
      ALERT_WEBHOOK_URL: 'https://hook.test/x',
      ALERT_WEBHOOK_SECRET: 'sekret',
      ALERT_EVENTS: 'login.locked',
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });

    await alert.maybeAlert({
      event: 'login.locked', actor: 'bob', ip: '1.2.3.4', reason: 'too many',
      password: 'leak', cookie: 'c', extra: 'nope', // these must be stripped
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://hook.test/x');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({ event: 'login.locked', actor: 'bob', ip: '1.2.3.4', reason: 'too many', source: 'homelabarr-ce' });
    expect(body.password).toBeUndefined();
    expect(body.cookie).toBeUndefined();
    expect(body.extra).toBeUndefined();

    const expected = 'sha256=' + crypto.createHmac('sha256', 'sekret').update(opts.body).digest('hex');
    expect(opts.headers['X-HomelabARR-Signature']).toBe(expected);
  });

  it('omits the signature header when no secret is configured', async () => {
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy.mock.calls[0][1].headers['X-HomelabARR-Signature']).toBeUndefined();
  });

  it('does not send for an event outside the allowlist', async () => {
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'some.other.event', ip: '1.1.1.1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('per-key cooldown (AC4)', () => {
  it('suppresses repeat alerts for the same event|ip within the 5-minute window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime());
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });

    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' }); // sends
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' }); // cooled down → suppressed
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // A different IP is a different cooldown key → sends.
    await alert.maybeAlert({ event: 'login.locked', ip: '2.2.2.2' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // After the cooldown elapses, the original key sends again.
    vi.setSystemTime(new Date('2026-01-01T00:05:01Z').getTime());
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

describe('SSRF / scheme guard (AC4)', () => {
  it('refuses a non-https webhook URL (no fetch) unless insecure is explicitly allowed', async () => {
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'http://insecure.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows http when ALERT_WEBHOOK_ALLOW_INSECURE=true (LAN escape hatch)', async () => {
    const alert = await loadAlert({
      ALERT_WEBHOOK_URL: 'http://lan.test/x',
      ALERT_WEBHOOK_ALLOW_INSECURE: 'true',
      ALERT_EVENTS: 'login.locked',
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no webhook URL is configured', async () => {
    const alert = await loadAlert({ ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
