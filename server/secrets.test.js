import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-212: secrets.js precedence + cache.
// SECRET_ROOT is read once at module load, and the module keeps an in-memory
// cache, so each test resets modules and re-imports with a fresh SECRET_ROOT
// pointing at a throwaway tmp dir (stands in for Docker's /run/secrets).
describe('server/secrets', () => {
  let tmp;
  let secrets;

  async function load() {
    vi.resetModules();
    secrets = await import('./secrets.js');
  }

  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-secrets-'));
    process.env.SECRET_ROOT = tmp;
    // Clean slate for the names these tests touch.
    delete process.env.JWT_SECRET;
    delete process.env.JWT_SECRET_FILE;
    await load();
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    delete process.env.SECRET_ROOT;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_SECRET_FILE;
  });

  describe('precedence: Docker secret > _FILE > env', () => {
    it('prefers the Docker secret file (SECRET_ROOT/<lowercase name>) over _FILE and env', () => {
      fs.writeFileSync(path.join(tmp, 'jwt_secret'), 'docker-value');
      const fileSecret = path.join(tmp, 'from-file');
      fs.writeFileSync(fileSecret, 'file-value');
      process.env.JWT_SECRET_FILE = fileSecret;
      process.env.JWT_SECRET = 'env-value';

      expect(secrets.readSecret('JWT_SECRET')).toBe('docker-value');
    });

    it('falls back to the _FILE path when no Docker secret exists', () => {
      const fileSecret = path.join(tmp, 'from-file');
      fs.writeFileSync(fileSecret, 'file-value');
      process.env.JWT_SECRET_FILE = fileSecret;
      process.env.JWT_SECRET = 'env-value';

      expect(secrets.readSecret('JWT_SECRET')).toBe('file-value');
    });

    it('falls back to the plain env var last', () => {
      process.env.JWT_SECRET = 'env-value';
      expect(secrets.readSecret('JWT_SECRET')).toBe('env-value');
    });

    it('ignores a _FILE pointer to a non-existent path and uses the env var (HLCE-263)', () => {
      // Pins the `filePath && existsSync(filePath)` AND: with a stale _FILE
      // pointer the code must require BOTH a path AND that it exists before
      // reading it, then fall through to env. The `||` mutant would try to
      // readFileSync the missing path and blow up instead.
      process.env.JWT_SECRET_FILE = path.join(tmp, 'does-not-exist');
      process.env.JWT_SECRET = 'env-value';
      expect(secrets.readSecret('JWT_SECRET')).toBe('env-value');
    });

    it('trims trailing whitespace from file-backed secrets but not env values', async () => {
      const dockerFile = path.join(tmp, 'jwt_secret');
      fs.writeFileSync(dockerFile, 'docker-value\n\n');
      expect(secrets.readSecret('JWT_SECRET')).toBe('docker-value');

      // Remove the Docker secret so the env var is the resolved source, and
      // confirm env values are returned verbatim (no trailing-space trim).
      fs.rmSync(dockerFile);
      await load();
      process.env.JWT_SECRET = 'env-value  ';
      expect(secrets.readSecret('JWT_SECRET')).toBe('env-value  ');
    });
  });

  // HLCE-263: mutation-pass hardening for server/secrets.js. The tests below
  // pin behaviour the precedence suite above left un-asserted (the lowercase
  // Docker path, the default SECRET_ROOT, and the exact whitespace-trim regex).
  describe('Docker secret path construction (HLCE-263)', () => {
    it('looks up the Docker secret under SECRET_ROOT using the lowercased name', async () => {
      // FS-independent: assert the literal path requested rather than relying on
      // the host filesystem (macOS is case-insensitive, which masks toUpperCase).
      const seen = [];
      const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        seen.push(p);
        return false; // force fall-through to the throw so the path is the only signal
      });
      try {
        expect(() => secrets.readSecret('JWT_SECRET')).toThrowError('secret-missing: JWT_SECRET');
        // First existsSync call is the Docker path; it must be lowercased.
        expect(seen[0]).toBe(tmp + '/jwt_secret');
        expect(seen[0]).not.toBe(tmp + '/JWT_SECRET');
      } finally {
        existsSpy.mockRestore();
      }
    });

    it('defaults SECRET_ROOT to /run/secrets when the env var is unset', async () => {
      delete process.env.SECRET_ROOT;
      await load();
      const seen = [];
      const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        seen.push(p);
        return false;
      });
      try {
        expect(() => secrets.readSecret('JWT_SECRET')).toThrowError('secret-missing: JWT_SECRET');
        expect(seen[0]).toBe('/run/secrets/jwt_secret');
      } finally {
        existsSpy.mockRestore();
      }
    });
  });

  describe('whitespace trimming is trailing-only and global (HLCE-263)', () => {
    it('trims ALL trailing whitespace from a Docker secret but leaves interior spaces', () => {
      // "a b\n\n" distinguishes /\s+$/ (anchored, global tail) from the mutants:
      //   /\s+/  (unanchored) would eat the interior space -> "ab\n\n"
      //   /\s$/  (single char) would leave one trailing newline -> "a b\n"
      fs.writeFileSync(path.join(tmp, 'jwt_secret'), 'a b\n\n');
      expect(secrets.readSecret('JWT_SECRET')).toBe('a b');
    });

    it('trims ALL trailing whitespace from a _FILE secret but leaves interior spaces', () => {
      const fileSecret = path.join(tmp, 'from-file');
      fs.writeFileSync(fileSecret, 'a b\t \n');
      process.env.JWT_SECRET_FILE = fileSecret;
      expect(secrets.readSecret('JWT_SECRET')).toBe('a b');
    });
  });

  describe('required handling', () => {
    it('throws secret-missing when a required secret is absent everywhere', () => {
      expect(() => secrets.readSecret('JWT_SECRET')).toThrowError('secret-missing: JWT_SECRET');
    });

    it('returns null (and caches it) when required:false and the secret is absent', () => {
      expect(secrets.readSecret('JWT_SECRET', { required: false })).toBeNull();
      // Even after the env appears, the cached null is returned until a fresh read.
      process.env.JWT_SECRET = 'late-value';
      expect(secrets.readSecret('JWT_SECRET', { required: false })).toBeNull();
    });

    it('empty-string env var is a real value (not treated as missing)', () => {
      process.env.JWT_SECRET = '';
      expect(secrets.readSecret('JWT_SECRET')).toBe('');
    });
  });

  describe('cache + readSecretFresh', () => {
    it('caches the first read; a changed env is ignored until readSecretFresh', () => {
      process.env.JWT_SECRET = 'first';
      expect(secrets.readSecret('JWT_SECRET')).toBe('first');

      process.env.JWT_SECRET = 'second';
      // Cached.
      expect(secrets.readSecret('JWT_SECRET')).toBe('first');
      // Fresh read invalidates and re-resolves.
      expect(secrets.readSecretFresh('JWT_SECRET')).toBe('second');
      // And the fresh value is now what the cache serves.
      expect(secrets.readSecret('JWT_SECRET')).toBe('second');
    });

    it('readSecretFresh never throws for a missing secret (required:false semantics)', () => {
      expect(secrets.readSecretFresh('JWT_SECRET')).toBeNull();
    });
  });
});
