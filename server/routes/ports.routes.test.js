import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-271 AC3: integration tests for the port-discovery routes (ports.js) —
// GET /ports/check (execSync `docker ps -a`, with a template-mode fallback when
// Docker is missing) and GET /ports/available (dockerManager listContainers +
// first-free-port scan). Exercises the real route factory and the REAL
// requireAuth middleware, with child_process (execSync) and dockerManager
// mocked per the ticket Test Plan.
//
// Env must be set before auth.js is imported (its key/DB init runs at import),
// so all imports are dynamic and live in beforeAll.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-ports-'));
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

// child_process is mocked at the module level so ports.js (execSync) receives
// the fake. vi.mock is hoisted above imports.
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

let request, express, cookieParser, execSync;
let requireAuth, generateToken;
let portRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  ({ execSync } = await import('child_process'));
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  generateToken = auth.generateToken;
  portRoutes = (await import('./ports.js')).default;
});

beforeEach(() => {
  vi.mocked(execSync).mockReset();
});

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

// A logged-in admin cookie produced by the REAL token signer, so the REAL
// requireAuth middleware accepts the request end-to-end.
function adminCookie() {
  const token = generateToken({ id: 'u-admin', username: 'admin', role: 'admin' });
  return `hl_session=${token}`;
}

function buildApp(overrides = {}) {
  const deps = {
    sendError: (res, status, message) => res.status(status).json({ error: message }),
    requireAuth,
    dockerManager: overrides.dockerManager,
    logger: silentLogger,
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(portRoutes(deps));
  return { app, deps };
}

// A dockerManager double for the /ports/available path. listContainers is
// injectable so a test can return its own container list. Mirrors the real
// executeWithRetry contract: degraded + allowDegraded returns the fallback.
function dockerManagerStub(status = 'available', listContainers = vi.fn().mockResolvedValue([])) {
  return {
    _listContainers: listContainers,
    getServiceStatus: vi.fn().mockReturnValue(
      status === 'unavailable'
        ? { status: 'unavailable', message: 'Docker socket not accessible' }
        : { status: 'available', message: 'ok' }
    ),
    executeWithRetry: vi.fn(async (op, _name, opts = {}) => {
      if (status === 'unavailable' && opts.allowDegraded) return opts.fallbackValue;
      return op({ listContainers });
    }),
    createErrorResponse: vi.fn((operation, error) => ({
      success: false,
      operation,
      error: error?.message || String(error),
    })),
  };
}

describe('AC3 — GET /ports/check', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const { app } = buildApp({ dockerManager: dockerManagerStub() });
    const res = await request(app).get('/ports/check');
    expect(res.status).toBe(401);
  });

  it('parses `docker ps` JSON lines and returns the used ports from CLI', async () => {
    vi.mocked(execSync).mockReturnValue(
      '{"Ports":"0.0.0.0:8080->80/tcp"}\n{"Ports":"0.0.0.0:3000->3000/tcp"}\n'
    );
    const { app } = buildApp({ dockerManager: dockerManagerStub() });

    const res = await request(app).get('/ports/check').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.source).toBe('cli');
    expect(res.body.usedPorts).toContain(8080);
    expect(res.body.usedPorts).toContain(3000);
  });

  it('falls back to template mode (not an error) when Docker is unavailable', async () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('docker: command not found'); });
    const { app } = buildApp({ dockerManager: dockerManagerStub() });

    const res = await request(app).get('/ports/check').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('template-fallback');
    expect(res.body.docker.status).toBe('template-mode');
    expect(res.body.usedPorts).toEqual([30002, 8083]);
    expect(silentLogger.warn).toHaveBeenCalled();
  });

  it('skips a malformed `docker ps` line and still parses the good one', async () => {
    vi.mocked(execSync).mockReturnValue(
      'not-json-here\n{"Ports":"0.0.0.0:9090->90/tcp"}\n'
    );
    const { app } = buildApp({ dockerManager: dockerManagerStub() });

    const res = await request(app).get('/ports/check').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('cli');
    expect(res.body.usedPorts).toEqual([9090]);
  });
});

describe('AC3 — GET /ports/available', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const { app } = buildApp({ dockerManager: dockerManagerStub() });
    const res = await request(app).get('/ports/available');
    expect(res.status).toBe(401);
  });

  it('returns 503 when Docker is unavailable', async () => {
    const dockerManager = dockerManagerStub('unavailable');
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/ports/available').set('Cookie', adminCookie());

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('returns the first free port in the requested range', async () => {
    const listContainers = vi.fn().mockResolvedValue([
      { Ports: [{ PublicPort: 8000 }] },
      { Ports: [{ PublicPort: 8001 }] },
    ]);
    const dockerManager = dockerManagerStub('available', listContainers);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/ports/available?start=8000&end=8005')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.availablePort).toBe(8002);
  });

  it('returns 404 when the range is fully exhausted', async () => {
    const listContainers = vi.fn().mockResolvedValue([{ Ports: [{ PublicPort: 8000 }] }]);
    const dockerManager = dockerManagerStub('available', listContainers);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/ports/available?start=8000&end=8000')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No available ports/);
  });

  it('maps a degraded docker error to 503 and a plain error to 500', async () => {
    const degradedErr = Object.assign(new Error('docker degraded'), { dockerStatus: 'degraded' });
    const degradedMgr = dockerManagerStub('available');
    degradedMgr.executeWithRetry.mockRejectedValueOnce(degradedErr);
    const { app: degradedApp } = buildApp({ dockerManager: degradedMgr });

    const degradedRes = await request(degradedApp)
      .get('/ports/available')
      .set('Cookie', adminCookie());
    expect(degradedRes.status).toBe(503);

    const plainMgr = dockerManagerStub('available');
    plainMgr.executeWithRetry.mockRejectedValueOnce(new Error('boom'));
    const { app: plainApp } = buildApp({ dockerManager: plainMgr });

    const plainRes = await request(plainApp)
      .get('/ports/available')
      .set('Cookie', adminCookie());
    expect(plainRes.status).toBe(500);
  });
});
