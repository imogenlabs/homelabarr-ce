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

  it('does NOT arm the cooldown when the webhook delivery fails (HLCE-282)', async () => {
    // REGRESSION (HLCE-282): the cooldown was recorded BEFORE the fetch, so a
    // failed/unreachable webhook armed the cooldown and silently suppressed the
    // NEXT (possibly successful) alert for the whole window. The cooldown must
    // arm only on a confirmed delivery; an HTTP error or a thrown fetch must
    // leave the key unset so the next attempt can still send.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime());
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });

    // First delivery returns a 500 -> must NOT arm the cooldown.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500 });
    await alert.maybeAlert({ event: 'login.locked', ip: '9.9.9.9' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Immediately retry (well within the window). Because the prior send failed,
    // the cooldown is NOT armed, so this attempt still fires.
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '9.9.9.9' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Now the cooldown IS armed (last send succeeded) -> a third attempt is suppressed.
    await alert.maybeAlert({ event: 'login.locked', ip: '9.9.9.9' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('prunes cooldown entries older than the window so the Map stays bounded (HLCE-282)', async () => {
    // The cooldown key embeds the caller-supplied ip; without pruning an attacker
    // spraying unique IPs grows lastSentByKey without bound. Entries older than
    // COOLDOWN_MS can never suppress again, so maybeAlert must evict them. We
    // assert the cooldown for an OLD ip no longer suppresses after the window —
    // an entry that was never pruned would still be present (but harmlessly
    // expired); the observable bound-keeping signal is that an expired key sends.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime());
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });

    // Seed many distinct-ip entries.
    for (let i = 0; i < 5; i++) {
      await alert.maybeAlert({ event: 'login.locked', ip: `10.0.0.${i}` });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(5);

    // Advance past the window and fire one more alert: the prune pass on this
    // call must have evicted all 5 stale entries (they can no longer suppress),
    // leaving the Map holding only the just-sent key.
    vi.setSystemTime(new Date('2026-01-01T00:06:00Z').getTime());
    await alert.maybeAlert({ event: 'login.locked', ip: '10.0.0.99' });
    const size = alert.cooldownSizeForTest();
    expect(size).toBe(1);
  });
});

describe('SSRF / scheme guard (AC4)', () => {
  // Pins the https-only egress check in alert.js (the ALERT_HOOK_URL IIFE): the
  // webhook URL must be https unless ALERT_WEBHOOK_ALLOW_INSECURE=true, so a
  // plaintext http:// (or otherwise malformed) URL is dropped and never fetched.
  // This is the SSRF/exfil guard for the only outbound request this module makes.
  it('accepts an https webhook URL and fires the request (https-only pin, HLCE-282)', async () => {
    const alert = await loadAlert({ ALERT_WEBHOOK_URL: 'https://hook.test/x', ALERT_EVENTS: 'login.locked' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    await alert.maybeAlert({ event: 'login.locked', ip: '1.1.1.1' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://hook.test/x');
  });

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
