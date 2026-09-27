import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-proxy-'));
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-that-is-definitely-long-enough';
  process.env.DB_PATH = ':memory:';
  process.env.DATA_DIR = tmp;
  process.env.AUDIT_DIR = path.join(os.tmpdir(), `hlce-proxy-audit-${process.pid}`);
  fs.mkdirSync(process.env.AUDIT_DIR, { recursive: true });
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const key of ['TRUST_PROXY_HOPS', 'JWT_SECRET', 'DB_PATH', 'DATA_DIR', 'AUDIT_DIR', 'SECRET_ROOT']) delete process.env[key];
});

async function loadApp(hops) {
  vi.resetModules();
  if (hops === undefined) delete process.env.TRUST_PROXY_HOPS;
  else process.env.TRUST_PROXY_HOPS = String(hops);
  return import('./index.js');
}

const login = (app, forwarded) => request(app).post('/auth/login')
  .set('X-Forwarded-For', forwarded).send({});

describe('backend proxy trust', () => {
  it('does not copy a raw forwarded header into activity metadata', async () => {
    const { getRequestMeta } = await loadApp(1);
    expect(getRequestMeta({ ip: undefined, headers: { 'x-forwarded-for': '198.51.100.99' } }).ipAddress).toBe('');
  });

  it('gives two clients behind the bundled nginx separate login buckets', async () => {
    const { app } = await loadApp();
    for (let i = 0; i < 25; i++) expect((await login(app, '203.0.113.10')).status).toBe(400);
    expect((await login(app, '203.0.113.10')).status).toBe(429);
    expect((await login(app, '203.0.113.11')).status).toBe(400);
  });

  it('ignores a client-supplied address before the trusted hop', async () => {
    const { app } = await loadApp(1);
    for (let i = 0; i < 25; i++) {
      expect((await login(app, `198.51.100.${i + 1}, 203.0.113.10`)).status).toBe(400);
    }
    expect((await login(app, '198.51.100.200, 203.0.113.10')).status).toBe(429);
    const { db } = await import('./db.js');
    expect(db.prepare("SELECT key FROM rate_buckets WHERE key LIKE 'login:%'").all().map(row => row.key))
      .toEqual(['login:203.0.113.10']);
  });

  it('resolves the client through three configured hops', async () => {
    const { app } = await loadApp(3);
    const response = await login(app, '203.0.113.10, 192.0.2.1, 192.0.2.2');
    expect(response.status).toBe(400);
    const { db } = await import('./db.js');
    expect(db.prepare("SELECT key FROM rate_buckets WHERE key LIKE 'login:%'").all().map(row => row.key))
      .toEqual(['login:203.0.113.10']);
  });

  it.each(['abc', '1.5', '-1', '', '1x'])('rejects invalid hop count %j at startup', async value => {
    vi.resetModules();
    process.env.TRUST_PROXY_HOPS = value;
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { EnvironmentManager } = await import('./environment-manager.js');
    expect(() => EnvironmentManager.getConfiguration()).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('TRUST_PROXY_HOPS'));
  });
});
