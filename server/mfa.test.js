import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-214: MFA (TOTP window + backup codes + pending TTL).
// mfa.js resolves CONFIG_DIR and BCRYPT_COST at import, so each test resets
// modules and re-imports with env pointing at a throwaway tmp dir and a low
// bcrypt cost. TOTP reads the wall clock, so the time-sensitive tests run under
// vi fake timers.
let tmp;

async function loadMfa() {
  vi.resetModules();
  process.env.CONFIG_DIR = tmp;
  process.env.BCRYPT_COST = '4';
  return import('./mfa.js');
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-mfa-'));
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CONFIG_DIR;
  delete process.env.BCRYPT_COST;
});

describe('newTotp', () => {
  it('builds a 6-digit / 30s SHA1 TOTP with a base32 secret', async () => {
    const mfa = await loadMfa();
    const totp = mfa.newTotp('alice@homelabarr');
    expect(totp.digits).toBe(6);
    expect(totp.period).toBe(30);
    expect(totp.secret.base32).toMatch(/^[A-Z2-7]+$/);
  });
});

describe('verifyTotp (AC1, AC2)', () => {
  const FIXED = new Date('2026-01-01T00:00:00Z').getTime();

  it('verifies a freshly generated token under fixed fake time', async () => {
    const mfa = await loadMfa();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
    const totp = mfa.newTotp('alice');
    const token = totp.generate();
    expect(mfa.verifyTotp(totp.secret.base32, token)).toBe(true);
  });

  it('accepts a token one step earlier but rejects two steps earlier (window:1 boundary)', async () => {
    const mfa = await loadMfa();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
    const totp = mfa.newTotp('alice');
    const secret = totp.secret.base32;
    const prev1 = totp.generate({ timestamp: FIXED - 30_000 });
    const prev2 = totp.generate({ timestamp: FIXED - 60_000 });
    const next1 = totp.generate({ timestamp: FIXED + 30_000 });
    expect(mfa.verifyTotp(secret, prev1)).toBe(true);
    expect(mfa.verifyTotp(secret, next1)).toBe(true);
    expect(mfa.verifyTotp(secret, prev2)).toBe(false);
  });

  it('rejects random, wrong-length, and non-numeric codes', async () => {
    const mfa = await loadMfa();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
    const totp = mfa.newTotp('alice');
    const secret = totp.secret.base32;

    // A 6-digit code that is none of the in-window valid tokens.
    const valid = new Set([
      totp.generate({ timestamp: FIXED - 30_000 }),
      totp.generate({ timestamp: FIXED }),
      totp.generate({ timestamp: FIXED + 30_000 }),
    ]);
    let wrong = '000000';
    for (let i = 0; i < 1000; i++) {
      const c = String(i).padStart(6, '0');
      if (!valid.has(c)) { wrong = c; break; }
    }

    expect(mfa.verifyTotp(secret, wrong)).toBe(false);
    expect(mfa.verifyTotp(secret, '12345')).toBe(false);
    expect(mfa.verifyTotp(secret, '1234567')).toBe(false);
    expect(mfa.verifyTotp(secret, 'abcdef')).toBe(false);
    expect(mfa.verifyTotp(secret, '')).toBe(false);
  });
});

describe('backup codes (AC3)', () => {
  it('makeBackupCodes produces N unique 10-hex-char codes', async () => {
    const mfa = await loadMfa();
    const codes = mfa.makeBackupCodes(10);
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(c).toMatch(/^[0-9a-f]{10}$/);
    expect(new Set(codes).size).toBe(10);
    // Respects a custom count.
    expect(mfa.makeBackupCodes(3)).toHaveLength(3);
  });

  it('verifyBackupCode returns the matching index and -1 for a wrong code', async () => {
    const mfa = await loadMfa();
    const codes = mfa.makeBackupCodes(5);
    const hashes = await mfa.hashBackupCodes(codes);
    expect(await mfa.verifyBackupCode(codes[3], hashes)).toBe(3);
    expect(await mfa.verifyBackupCode('not-a-real-code', hashes)).toBe(-1);
  });

  it('skips null slots (consumed codes) without matching them', async () => {
    const mfa = await loadMfa();
    const codes = mfa.makeBackupCodes(3);
    const hashes = await mfa.hashBackupCodes(codes);
    // Simulate code 0 already consumed (its hash nulled out).
    hashes[0] = null;
    // Code 1 still matches at its index; the nulled slot 0 is skipped.
    expect(await mfa.verifyBackupCode(codes[1], hashes)).toBe(1);
    // The consumed code no longer matches anything.
    expect(await mfa.verifyBackupCode(codes[0], hashes)).toBe(-1);
  });
});

describe('per-user MFA store', () => {
  it('round-trips and disables MFA config for a user, persisting to CONFIG_DIR', async () => {
    const mfa = await loadMfa();
    expect(mfa.getMfaForUser('u1')).toBeNull();

    mfa.saveMfaForUser('u1', { secret: 'BASE32SECRET', enabled: true });
    expect(mfa.getMfaForUser('u1')).toEqual({ secret: 'BASE32SECRET', enabled: true });

    // Stored on disk under the seam dir, and isolated per user.
    expect(fs.existsSync(path.join(tmp, 'mfa.json'))).toBe(true);
    expect(mfa.getMfaForUser('u2')).toBeNull();

    mfa.disableMfaForUser('u1');
    expect(mfa.getMfaForUser('u1')).toBeNull();
  });
});

describe('pending MFA TTL (AC4)', () => {
  it('returns a pending entry before expiry and null after', async () => {
    const mfa = await loadMfa();
    mfa.setPendingMfa('u1', { secret: 'S', codes: [], exp: Date.now() + 10_000 });
    expect(mfa.getPendingMfa('u1')).toMatchObject({ secret: 'S' });

    mfa.setPendingMfa('u2', { secret: 'S2', exp: Date.now() - 1 });
    expect(mfa.getPendingMfa('u2')).toBeNull();
  });

  it('returns null for a user with no pending entry, and clearPendingMfa removes it', async () => {
    const mfa = await loadMfa();
    expect(mfa.getPendingMfa('ghost')).toBeNull();

    mfa.setPendingMfa('u1', { secret: 'S', exp: Date.now() + 10_000 });
    mfa.clearPendingMfa('u1');
    expect(mfa.getPendingMfa('u1')).toBeNull();
  });
});
