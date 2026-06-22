import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-271 AC2: integration tests for the health route surface (health.js,
// mounted at root). Covers the unauthenticated liveness probe, the admin-only
// /health/detail aggregate (OK / DEGRADED / ERROR / handler-error contract),
// and the admin-only /health/secrets freshness audit. Exercises the REAL
// requireAuth + requireRole('admin') middleware end-to-end via signed cookies.
//
// The HLCE-265 invariant is pinned here: a health handler that throws must
// surface 500 via sendError, never a 200 that monitoring misreads as healthy.
//
// Env must be set before auth.js is imported (its key/DB init runs at import),
// so all imports are dynamic and live in beforeAll. child_process is mocked so
// /health/detail's `docker info` probe (DOCKER_HOST unset) hits the fake.
//
// The route factory is reentrant (Router() built per call), so one import is
// reused across every buildApp().
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-health-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
delete process.env.SMTP_HOST;

// Hoisted above imports. Default execSync throws so the `docker info` probe
// reads as disconnected unless a test overrides it.
vi.mock('child_process', () => ({
  execSync: vi.fn(() => { throw new Error('docker not reachable'); }),
  spawn: vi.fn(),
}));

let request, express, cookieParser, execSync;
let requireAuth, optionalAuth, requireRole, generateToken;
let healthRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  ({ execSync } = await import('child_process'));
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  optionalAuth = auth.optionalAuth;
  requireRole = auth.requireRole;
  generateToken = auth.generateToken;
  healthRoutes = (await import('./health.js')).default;
});

beforeEach(() => {
  vi.mocked(execSync).mockReset();
  vi.mocked(execSync).mockImplementation(() => { throw new Error('docker not reachable'); });
});

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function adminCookie() {
  return `hl_session=${generateToken({ id: 'u-admin', username: 'admin', role: 'admin' })}`;
}

function userCookie() {
  return `hl_session=${generateToken({ id: 'u-user', username: 'user', role: 'user' })}`;
}

function disconnectedDockerManager() {
  return {
    getConnectionState: vi.fn().mockReturnValue({
      isConnected: false,
      lastError: null,
      retryCount: 0,
      isRetrying: false,
      nextRetryAt: null,
      lastSuccessfulConnection: null,
      config: { socketPath: '/var/run/docker.sock', retryAttempts: 3 },
      circuitBreaker: {},
    }),
    getServiceStatus: vi.fn().mockReturnValue({ status: 'disconnected', message: 'ok' }),
  };
}

function buildApp(overrides = {}) {
  const deps = {
    requireAuth,
    requireRole,
    sendError: (res, status, message, err) => {
      if (err) silentLogger.error(message, err);
      res.status(status).json({ error: message });
    },
    dockerManager: overrides.dockerManager || disconnectedDockerManager(),
    envConfig: overrides.envConfig || { platform: 'linux', environment: 'production', nodeEnv: 'test' },
    networkConfig: overrides.networkConfig || { bindAddress: '127.0.0.1', port: 30002, dockerSocket: '/var/run/docker.sock' },
    EnvironmentManager: overrides.EnvironmentManager || {
      validateConfiguration: vi.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
      getCorsOptions: vi.fn().mockReturnValue({ origin: '*', credentials: true }),
      isContainerized: vi.fn().mockReturnValue(false),
    },
    NetworkManager: overrides.NetworkManager || {
      validateNetworkConfiguration: vi.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
    },
    DeploymentLogger: {},
    logger: silentLogger,
    isDevelopment: false,
    getProcessCounters: overrides.getProcessCounters || (() => ({})),
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(healthRoutes(deps));
  return { app, deps };
}

describe('AC2 — GET /health (liveness, no auth)', () => {
  it('returns 200 with ok:true / state:ready and needs no cookie', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, state: 'ready' });
  });
});

describe('AC2 — GET /health/detail (admin-only aggregate)', () => {
  it('rejects an unauthenticated request with 401 (real requireAuth)', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health/detail');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin cookie with 403 (real requireRole)', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health/detail').set('Cookie', userCookie());
    expect(res.status).toBe(403);
  });

  it('admin with valid env/network but docker disconnected → 200 DEGRADED', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health/detail').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DEGRADED');
    expect(res.body.docker.status).not.toBe('connected');
  });

  it('admin with invalid env config → 503 ERROR', async () => {
    const EnvironmentManager = {
      validateConfiguration: vi.fn().mockReturnValue({ isValid: false, errors: ['bad'], warnings: [] }),
      getCorsOptions: vi.fn().mockReturnValue({ origin: '*', credentials: true }),
      isContainerized: vi.fn().mockReturnValue(false),
    };
    const { app } = buildApp({ EnvironmentManager });
    const res = await request(app).get('/health/detail').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('ERROR');
  });

  it('admin with invalid network config → 503 ERROR', async () => {
    const NetworkManager = {
      validateNetworkConfiguration: vi.fn().mockReturnValue({ isValid: false, errors: ['bad net'], warnings: [] }),
    };
    const { app } = buildApp({ NetworkManager });
    const res = await request(app).get('/health/detail').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('ERROR');
  });

  it('a throwing health handler surfaces 500 via sendError, never 200 (HLCE-265)', async () => {
    const EnvironmentManager = {
      validateConfiguration: vi.fn().mockImplementation(() => { throw new Error('boom'); }),
      getCorsOptions: vi.fn().mockReturnValue({ origin: '*', credentials: true }),
      isContainerized: vi.fn().mockReturnValue(false),
    };
    const { app } = buildApp({ EnvironmentManager });
    const res = await request(app).get('/health/detail').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTruthy();
  });
});

describe('AC2 — GET /health/secrets (admin-only freshness audit)', () => {
  const SECRET_NAMES = ['jwt_key_current', 'sqlcipher_key', 'alert_webhook_secret'];
  let secretRoot;
  let savedSecretRoot;

  beforeEach(() => {
    savedSecretRoot = process.env.SECRET_ROOT;
    secretRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-secrets-'));
    process.env.SECRET_ROOT = secretRoot;
  });

  afterEach(() => {
    process.env.SECRET_ROOT = savedSecretRoot;
    fs.rmSync(secretRoot, { recursive: true, force: true });
  });

  function writeSecret(name, ageDays = 0) {
    const p = path.join(secretRoot, name);
    fs.writeFileSync(p, 'secret-value');
    if (ageDays > 0) {
      const when = (Date.now() - ageDays * 86400000) / 1000;
      fs.utimesSync(p, when, when);
    }
  }

  it('rejects unauthenticated with 401 and non-admin with 403', async () => {
    const { app } = buildApp();
    expect((await request(app).get('/health/secrets')).status).toBe(401);
    expect((await request(app).get('/health/secrets').set('Cookie', userCookie())).status).toBe(403);
  });

  it('all secrets present and fresh → 200 with empty stale/missing', async () => {
    for (const name of SECRET_NAMES) writeSecret(name, 1);
    const { app } = buildApp();
    const res = await request(app).get('/health/secrets').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stale).toEqual([]);
    expect(res.body.missing).toEqual([]);
    expect(res.body.ok).toHaveLength(3);
  });

  it('a missing secret → 503 with the name in body.missing', async () => {
    writeSecret('sqlcipher_key', 1);
    writeSecret('alert_webhook_secret', 1);
    const { app } = buildApp();
    const res = await request(app).get('/health/secrets').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body.missing.map((m) => m.name)).toContain('jwt_key_current');
  });

  it('a stale secret (age > threshold) → 503 with the name in body.stale', async () => {
    writeSecret('jwt_key_current', 200); // threshold is 90 days
    writeSecret('sqlcipher_key', 1);
    writeSecret('alert_webhook_secret', 1);
    const { app } = buildApp();
    const res = await request(app).get('/health/secrets').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body.stale.map((s) => s.name)).toContain('jwt_key_current');
  });

  it('reads ONLY the three allowlisted names under SECRET_ROOT via path.join — no extra files, no traversal (HLCE-283)', async () => {
    // Drop a decoy alongside the real secrets; the fixed allowlist loop must never
    // statSync it. And every path the loop touches must be exactly
    // path.join(SECRET_ROOT, <allowlisted name>) — never a `+ '/' +` concat that
    // could be coaxed outside the root.
    for (const name of SECRET_NAMES) writeSecret(name, 1);
    writeSecret('decoy_should_not_be_read', 1);
    const statSpy = vi.spyOn(fs, 'statSync');
    const { app } = buildApp();
    const res = await request(app).get('/health/secrets').set('Cookie', adminCookie());
    expect(res.status).toBe(200);

    const secretPaths = statSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((p) => p.startsWith(secretRoot));
    const expected = SECRET_NAMES.map((n) => path.join(secretRoot, n)).sort();
    expect([...new Set(secretPaths)].sort()).toEqual(expected);
    // the decoy is never touched
    expect(secretPaths.some((p) => p.includes('decoy_should_not_be_read'))).toBe(false);
    statSpy.mockRestore();
  });
});
