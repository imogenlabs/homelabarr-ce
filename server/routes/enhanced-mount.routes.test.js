import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-271 AC1: integration tests for the enhanced-mount proxy routes. These
// exercise the real route factory (enhanced-mount.js) and the REAL requireAuth
// middleware. Each handler inspects a container (dockerManager, mocked), derives
// the host web port, then fetch()es the container's localhost API (fetch stubbed
// globally). We pin the auth gate, container-not-found → 500, the provider
// allowlist (400 before docker), and the safeWebPort guard (HLCE-267) that blocks
// an out-of-range container-reported port before any localhost fetch.
//
// Env must be set before auth.js is imported (its key/DB init runs at import),
// so all imports are dynamic and live in beforeAll.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-emount-'));
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

let request, express, cookieParser;
let requireAuth, generateToken;
let enhancedMountRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  generateToken = auth.generateToken;
  enhancedMountRoutes = (await import('./enhanced-mount.js')).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// A logged-in admin cookie produced by the REAL token signer, so the REAL
// requireAuth middleware accepts the request end-to-end.
function adminCookie() {
  const token = generateToken({ id: 'u-admin', username: 'admin', role: 'admin' });
  return `hl_session=${token}`;
}

// Build a fresh app mounting the enhanced-mount router UNDER its real prefix.
function buildApp(overrides = {}) {
  const deps = {
    sendError: (res, status, message, err) => res.status(status).json({ error: message }),
    dockerManager: overrides.dockerManager,
    requireAuth,
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/enhanced-mount', enhancedMountRoutes(deps));
  return { app, deps };
}

// A dockerManager double whose getContainer() returns a spy-able container that
// inspect()s to a NetworkSettings.Ports['8080/tcp'] mapping with the given host
// port. Set inspectRejects to simulate a missing container.
function makeDM({ hostPort = '9000', inspectRejects = false } = {}) {
  const inspect = inspectRejects
    ? vi.fn().mockRejectedValue(new Error('no such container'))
    : vi.fn().mockResolvedValue({
        NetworkSettings: { Ports: { '8080/tcp': [{ HostPort: hostPort }] } },
      });
  const getContainer = vi.fn().mockReturnValue({ inspect });
  const getDocker = vi.fn().mockReturnValue({ getContainer });
  return { getDocker, _getContainer: getContainer, _inspect: inspect };
}

// A container API success response shape for the stubbed global fetch.
function okFetch(body = { result: 'ok' }) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

describe('AC1 — enhanced-mount auth gate', () => {
  it('GET /:id/status without a cookie → 401 and never touches Docker', async () => {
    const dockerManager = makeDM();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/enhanced-mount/abc/status');

    expect(res.status).toBe(401);
    expect(dockerManager.getDocker).not.toHaveBeenCalled();
  });

  it('POST /:id/providers/local/enable without a cookie → 401', async () => {
    const dockerManager = makeDM();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).post('/enhanced-mount/abc/providers/local/enable');

    expect(res.status).toBe(401);
    expect(dockerManager.getDocker).not.toHaveBeenCalled();
  });
});

describe('AC1 — container lookup + proxy', () => {
  it('container-not-found (inspect rejects) → 500 via sendError, targeting the requested id', async () => {
    const dockerManager = makeDM({ inspectRejects: true });
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/ghost/status')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch enhanced mount status');
    expect(dockerManager._getContainer).toHaveBeenCalledWith('ghost');
  });

  it('happy path: GET /:id/status proxies to the container API and returns its data', async () => {
    const dockerManager = makeDM({ hostPort: '9000' });
    const fetchSpy = okFetch({ mounts: 3 });
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/c1/status')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.containerId).toBe('c1');
    expect(res.body.data).toEqual({ mounts: 3 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain('http://localhost:9000/api/v2/status');
  });

  it('container API non-ok response (502) → 500 via sendError', async () => {
    const dockerManager = makeDM({ hostPort: '9000' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/c1/status')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch enhanced mount status');
  });
});

describe('AC1 — provider allowlist (rejected before Docker)', () => {
  it('POST /:id/providers/notreal/enable → 400 Invalid provider, no docker access', async () => {
    const dockerManager = makeDM();
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .post('/enhanced-mount/c1/providers/notreal/enable')
      .set('Cookie', adminCookie())
      .send({ token: 'x' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid provider' });
    expect(dockerManager.getDocker).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POST /:id/providers/bogus/disable → 400 Invalid provider', async () => {
    const dockerManager = makeDM();
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .post('/enhanced-mount/c1/providers/bogus/disable')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid provider' });
    expect(dockerManager.getDocker).not.toHaveBeenCalled();
  });

  it('a valid provider proxies a POST enable to the container API', async () => {
    const dockerManager = makeDM({ hostPort: '9000' });
    const fetchSpy = okFetch({ enabled: true });
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .post('/enhanced-mount/c1/providers/local/enable')
      .set('Cookie', adminCookie())
      .send({ token: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('local');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('http://localhost:9000/api/v2/providers/local/enable');
    expect(opts.method).toBe('POST');
  });
});

describe('AC1 — safeWebPort guard (HLCE-267)', () => {
  it('an out-of-range container-reported port → 500, and fetch is never called', async () => {
    const dockerManager = makeDM({ hostPort: '99999' });
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/c1/status')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch enhanced mount status');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a valid boundary port (8080) proxies to localhost:8080', async () => {
    const dockerManager = makeDM({ hostPort: '8080' });
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/c1/status')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(fetchSpy.mock.calls[0][0]).toContain('http://localhost:8080/api/v2/status');
  });
});

describe('AC1 — additional proxy endpoints (coverage)', () => {
  it('POST /:id/auth/start proxies to /api/v2/auth/start with the provider in the body', async () => {
    const dockerManager = makeDM({ hostPort: '9000' });
    const fetchSpy = okFetch({ url: 'https://oauth' });
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .post('/enhanced-mount/c1/auth/start')
      .set('Cookie', adminCookie())
      .send({ provider: 'google' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('http://localhost:9000/api/v2/auth/start');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ provider: 'google' });
  });

  it('GET /:id/costs proxies to /api/v2/costs and returns its data', async () => {
    const dockerManager = makeDM({ hostPort: '9000' });
    const fetchSpy = okFetch({ total: 42 });
    vi.stubGlobal('fetch', fetchSpy);
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/enhanced-mount/c1/costs')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 42 });
    expect(fetchSpy.mock.calls[0][0]).toContain('http://localhost:9000/api/v2/costs');
  });
});
