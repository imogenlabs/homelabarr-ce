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
