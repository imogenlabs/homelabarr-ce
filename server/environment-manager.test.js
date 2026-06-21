import { describe, it, expect, afterEach, vi } from 'vitest';

// HLCE-220: startup security guard + CORS policy. EnvironmentManager caches its
// config behind a private #initialized flag, so each case resets modules and
// re-imports with fresh env. #validateCritical calls process.exit(1), which is
// spied so a "fatal" case is observable instead of killing the worker.
const ENV_KEYS = ['NODE_ENV', 'JWT_SECRET', 'AUTH_ENABLED', 'BIND_ADDRESS', 'CORS_ORIGIN'];

async function loadEnvMgr(env = {}) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  return (await import('./environment-manager.js')).EnvironmentManager;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.NODE_ENV = 'test';
});

// Resolve the cors `origin(origin, cb)` callback to a boolean allow/deny.
function allowOrigin(corsOptions, origin) {
  return new Promise((resolve) => {
    corsOptions.origin(origin, (err, ok) => resolve(!err && ok === true));
  });
}

describe('#validateCritical startup guard (AC3)', () => {
  it('exits when JWT_SECRET is under 32 characters', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'production', JWT_SECRET: 'too-short', AUTH_ENABLED: 'true' });
    EM.getConfiguration();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits when AUTH_ENABLED=false and the bind address is non-loopback', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const EM = await loadEnvMgr({
      NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), AUTH_ENABLED: 'false', BIND_ADDRESS: '0.0.0.0',
    });
    EM.getConfiguration();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('only warns (no exit) when AUTH_ENABLED=false but bound to loopback', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const EM = await loadEnvMgr({
      NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), AUTH_ENABLED: 'false', BIND_ADDRESS: '127.0.0.1',
    });
    EM.getConfiguration();
    expect(exit).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('does not exit with a valid secret and auth enabled', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), AUTH_ENABLED: 'true' });
    EM.getConfiguration();
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('public API smoke (AC6 coverage)', () => {
  it('builds a full configuration and the derived getters agree with it', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(40) });

    const cfg = EM.getConfiguration();
    expect(cfg).toMatchObject({ environment: 'development', authEnabled: true });
    expect(cfg.port).toBeGreaterThan(0);
    expect(['linux', 'darwin', 'windows']).toContain(EM.detectPlatform());
    expect(EM.detectEnvironment()).toBe('development');
    expect(typeof EM.isContainerized()).toBe('boolean');

    const docker = EM.getDockerConfig();
    expect(docker).toHaveProperty('socketPath');
    expect(docker).toHaveProperty('timeout');

    const validation = EM.validateConfiguration();
    expect(validation).toMatchObject({ isValid: expect.any(Boolean) });
    expect(Array.isArray(validation.errors)).toBe(true);

    expect(() => EM.logEnvironmentInfo()).not.toThrow();
  });

  it('flags a short JWT secret in validateConfiguration (non-fatal report path)', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'production', JWT_SECRET: 'short' });
    const validation = EM.validateConfiguration();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/JWT_SECRET/);
  });

  it('createCorsLoggingMiddleware returns a middleware that calls next()', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(40) });
    const mw = EM.createCorsLoggingMiddleware();
    let nexted = false;
    mw({ method: 'GET', url: '/', headers: {} }, {}, () => { nexted = true; });
    expect(nexted).toBe(true);
  });
});

describe('getCorsOptions policy (AC4)', () => {
  it('development allows localhost + RFC-1918 origins and denies public ones', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    const EM = await loadEnvMgr({ NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(40) });
    const opts = EM.getCorsOptions();
    expect(opts.credentials).toBe(true);

    expect(await allowOrigin(opts, 'http://localhost:5173')).toBe(true);
    expect(await allowOrigin(opts, 'http://192.168.1.20:3000')).toBe(true);
    expect(await allowOrigin(opts, 'http://10.0.0.5')).toBe(true);
    expect(await allowOrigin(opts, 'http://172.16.4.4')).toBe(true);
    expect(await allowOrigin(opts, undefined)).toBe(true); // same-origin / no Origin header
    expect(await allowOrigin(opts, 'http://evil.example.com')).toBe(false);
  });

  it('production denies RFC-1918 by default and allows only the configured origin', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    const EM = await loadEnvMgr({
      NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), CORS_ORIGIN: 'https://app.example.com',
    });
    const opts = EM.getCorsOptions();

    expect(await allowOrigin(opts, 'https://app.example.com')).toBe(true);
    expect(await allowOrigin(opts, 'http://192.168.1.20:3000')).toBe(false); // deny-by-default
    expect(await allowOrigin(opts, 'http://evil.example.com')).toBe(false);
  });
});
