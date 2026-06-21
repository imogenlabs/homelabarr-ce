import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-271 AC4: integration tests for the deployment-progress route factory
// (deployments.js). These exercise the real route handlers and the REAL
// requireAuth/optionalAuth middleware from auth.js. The auth middleware for
// subscribe/status/active is selected at FACTORY BUILD time by `authEnabled`,
// so most tests build with authEnabled:false (→ optionalAuth, no cookie needed)
// and one test builds with authEnabled:true to prove the real requireAuth wiring.
//
// The route factory is reentrant (Router() built per call), so one import is
// reused across every buildApp().
//
// Env must be set before auth.js is imported (its key/DB init runs at import),
// so all imports are dynamic.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-deploys-'));
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
let requireAuth, optionalAuth, generateToken;
let deploymentRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  optionalAuth = auth.optionalAuth;
  generateToken = auth.generateToken;
  deploymentRoutes = (await import('./deployments.js')).default;
});

// A logged-in admin cookie produced by the REAL token signer, so the REAL
// requireAuth middleware accepts the request end-to-end.
function adminCookie() {
  const token = generateToken({ id: 'u-admin', username: 'admin', role: 'admin' });
  return `hl_session=${token}`;
}

// A progressStream double whose collaborator methods are spy-able.
function stubProgressStream() {
  return {
    addClient: vi.fn(),
    getStatistics: vi.fn().mockReturnValue({ clients: 0 }),
    sendToClient: vi.fn(),
    subscribeToDeployment: vi.fn(),
  };
}

// Build a fresh app mounting the deployment route factory with injectable
// collaborators. requireAuth/optionalAuth are the real exports from auth.js.
function buildApp(overrides = {}) {
  const progressStream = overrides.progressStream || stubProgressStream();
  const deps = {
    sendError: (res, status, message) => res.status(status).json({ error: message }),
    cliBridge: 'cliBridge' in overrides ? overrides.cliBridge : undefined,
    streamingCLIBridge: overrides.streamingCLIBridge ?? null,
    progressStream,
    authEnabled: overrides.authEnabled ?? false,
    requireAuth,
    optionalAuth,
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(deploymentRoutes(deps));
  return { app, deps, progressStream };
}

describe('AC4 — GET /deployment-modes', () => {
  it('returns the three modes and cliAvailable:true when a cliBridge is present', async () => {
    const { app } = buildApp({ cliBridge: {} });
    const res = await request(app).get('/deployment-modes');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cliAvailable).toBe(true);
    expect(res.body.modes).toHaveLength(3);
  });

  it('returns cliAvailable:false when no cliBridge is wired', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).get('/deployment-modes');

    expect(res.status).toBe(200);
    expect(res.body.cliAvailable).toBe(false);
  });
});

describe('AC4 — POST /stream/deployments/:deploymentId/subscribe', () => {
  it('rejects a body with no clientId (400) and never subscribes', async () => {
    const { app, progressStream } = buildApp({ authEnabled: false });
    const res = await request(app).post('/stream/deployments/dep-1/subscribe').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Client ID is required/);
    expect(progressStream.subscribeToDeployment).not.toHaveBeenCalled();
  });

  it('subscribes the client to the requested deployment id (200)', async () => {
    const { app, progressStream } = buildApp({ authEnabled: false });
    const res = await request(app)
      .post('/stream/deployments/dep-1/subscribe')
      .send({ clientId: 'c-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(progressStream.subscribeToDeployment).toHaveBeenCalledTimes(1);
    expect(progressStream.subscribeToDeployment).toHaveBeenCalledWith('c-1', 'dep-1');
  });

  it('rejects an unauthenticated subscribe with 401 when authEnabled wires requireAuth', async () => {
    const { app, progressStream } = buildApp({ authEnabled: true });
    const res = await request(app)
      .post('/stream/deployments/dep-1/subscribe')
      .send({ clientId: 'c-1' });

    expect(res.status).toBe(401);
    expect(progressStream.subscribeToDeployment).not.toHaveBeenCalled();
  });
});

describe('AC4 — GET /deployments/:deploymentId/status', () => {
  it('returns 200 with the deployment when the streaming bridge has a status', async () => {
    const status = { id: 'dep-1', state: 'running', progress: 42 };
    const streamingCLIBridge = { getDeploymentStatus: vi.fn().mockReturnValue(status) };
    const { app } = buildApp({ authEnabled: false, streamingCLIBridge });

    const res = await request(app).get('/deployments/dep-1/status');

    expect(res.status).toBe(200);
    expect(res.body.deployment).toMatchObject(status);
    expect(streamingCLIBridge.getDeploymentStatus).toHaveBeenCalledWith('dep-1');
  });

  it('returns 404 when the streaming bridge has no such deployment', async () => {
    const streamingCLIBridge = { getDeploymentStatus: vi.fn().mockReturnValue(null) };
    const { app } = buildApp({ authEnabled: false, streamingCLIBridge });

    const res = await request(app).get('/deployments/dep-1/status');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });

  it('returns 503 when no streaming bridge is wired', async () => {
    const { app } = buildApp({ authEnabled: false, streamingCLIBridge: null });

    const res = await request(app).get('/deployments/dep-1/status');

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not available/);
  });
});

describe('AC4 — GET /deployments/active', () => {
  it('lists active deployments with a count from the streaming bridge', async () => {
    const streamingCLIBridge = {
      getActiveDeployments: vi.fn().mockReturnValue([{ id: 'd1' }, { id: 'd2' }]),
    };
    const { app } = buildApp({ authEnabled: false, streamingCLIBridge });

    const res = await request(app).get('/deployments/active');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.deployments).toHaveLength(2);
  });

  it('returns an empty fallback list when no streaming bridge is wired', async () => {
    const { app } = buildApp({ authEnabled: false, streamingCLIBridge: null });

    const res = await request(app).get('/deployments/active');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.deployments).toEqual([]);
  });
});

describe('AC4 — GET /stream/progress (requireAuth, SSE)', () => {
  it('rejects an unauthenticated request with 401 (real requireAuth)', async () => {
    const { app, progressStream } = buildApp();
    const res = await request(app).get('/stream/progress');

    expect(res.status).toBe(401);
    expect(progressStream.addClient).not.toHaveBeenCalled();
  });

  it('registers the SSE client and sends statistics for an authenticated request', async () => {
    // addClient takes over the response (SSE keep-alive), so we end it here to
    // let supertest's request resolve instead of hanging on an open stream.
    const progressStream = stubProgressStream();
    progressStream.addClient.mockImplementation((_clientId, res) => { res.end(); });
    const { app } = buildApp({ progressStream });

    await request(app).get('/stream/progress').set('Cookie', adminCookie());

    expect(progressStream.addClient).toHaveBeenCalledTimes(1);
    expect(progressStream.getStatistics).toHaveBeenCalledTimes(1);
    expect(progressStream.sendToClient).toHaveBeenCalledTimes(1);
  });

  it('surfaces a stream-setup failure as 500 via sendError', async () => {
    const progressStream = stubProgressStream();
    progressStream.addClient.mockImplementation(() => { throw new Error('boom'); });
    const { app } = buildApp({ progressStream });

    const res = await request(app).get('/stream/progress').set('Cookie', adminCookie());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to setup progress stream/);
  });
});
