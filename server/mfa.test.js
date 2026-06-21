import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-214: MFA (TOTP window + backup codes + pending TTL).
// mfa.js resolves CONFIG_DIR and BCRYPT_COST at import, so each test resets
// modules and re-imports with env pointing at a throwaway tmp dir and a low
// bcrypt cost. TOTP reads the wall clock, so the time-sensitive tests run under
// vi fake timers.
//
// HLCE-263 mutation pass: score 81.82% -> 90.91%. The 6 remaining survivors are
// genuine EQUIVALENT mutants (no observable behaviour change), left documented
// rather than gamed away:
//   - mfa.js:17 / :23  readFileSync('utf8') -> '' : Node's JSON.parse accepts a
//     Buffer and decodes it as UTF-8 itself, so dropping the encoding parses the
//     same object for the ASCII JSON these files hold.
//   - mfa.js:36  new Secret({ size: 20 }) -> new Secret({}) : otpauth's default
//     Secret size IS 20 bytes (32 base32 chars), so the object is identical.
//   - mfa.js:42 / :43  verifyTotp issuer/label : these fields are cosmetic
//     metadata; TOTP.validate() uses only secret/digits/period/algorithm, so the
//     verification result is unchanged.
//   - mfa.js:61  verifyBackupCode `i < hashes.length` -> `<=` : the extra
//     iteration reads hashes[length] === undefined, which the `if (hashes[i] &&
//     ...)` guard skips, so it returns the same index / -1.
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

describe('newTotp metadata (HLCE-263)', () => {
  // Pins the TOTP option object: the `{}` and issuer-string mutants leave
  // digits/period at their library defaults (also 6/30), so those alone don't
  // distinguish the mutant. The issuer/label DO differ from the defaults.
  it('stamps the HomelabARR issuer and the username as the label', async () => {
    const mfa = await loadMfa();
    const totp = mfa.newTotp('alice@homelabarr');
    expect(totp.issuer).toBe('HomelabARR');
    expect(totp.label).toBe('alice@homelabarr');
    expect(totp.algorithm).toBe('SHA1');
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

  it('honours BCRYPT_COST for the backup-code hash cost factor (HLCE-263)', async () => {
    // The bcrypt hash string encodes its cost as `$2a$NN$`. Pinning it kills the
    // `Number(process.env.BCRYPT_COST) || 12` -> `&&` mutant, which would force
    // cost 12 regardless of the env override.
    const mfa = await loadMfa(); // loadMfa sets BCRYPT_COST='4'
    const [hash] = await mfa.hashBackupCodes(['abcdef0123']);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
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

describe('default storage location (HLCE-263)', () => {
  it('defaults CONFIG_DIR to <cwd>/server/config when the env var is unset', async () => {
    // Don't actually write to the real server/config: re-import with CONFIG_DIR
    // cleared and a writeFileSync spy that captures the target path instead.
    vi.resetModules();
    delete process.env.CONFIG_DIR;
    process.env.BCRYPT_COST = '4';
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    try {
      const mfa = await import('./mfa.js');
      mfa.saveMfaForUser('u1', { enabled: true });
      const target = writeSpy.mock.calls[0][0];
      expect(target).toBe(path.join(process.cwd(), 'server', 'config', 'mfa.json'));
    } finally {
      writeSpy.mockRestore();
      delete process.env.CONFIG_DIR;
      delete process.env.BCRYPT_COST;
    }
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

  it('treats an entry expiring exactly now as still valid (strict < boundary, HLCE-263)', async () => {
    const mfa = await loadMfa();
    vi.useFakeTimers();
    const NOW = new Date('2026-06-21T00:00:00Z').getTime();
    vi.setSystemTime(NOW);
    // exp === Date.now(): the code uses `entry.exp < Date.now()` so this is NOT
    // yet expired. The `<=` mutant would wrongly treat it as expired -> null.
    mfa.setPendingMfa('edge', { secret: 'S', exp: NOW });
    expect(mfa.getPendingMfa('edge')).toMatchObject({ secret: 'S' });
  });

  it('returns null for a user with no pending entry, and clearPendingMfa removes it', async () => {
    const mfa = await loadMfa();
    expect(mfa.getPendingMfa('ghost')).toBeNull();

    mfa.setPendingMfa('u1', { secret: 'S', exp: Date.now() + 10_000 });
    mfa.clearPendingMfa('u1');
    expect(mfa.getPendingMfa('u1')).toBeNull();
  });
});
