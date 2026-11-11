import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// HLCE-370: POST /deploy refuses a deploy that would leave one of the app's own
// settings empty, and names them, before any deploy path answers "started".
// Uses the REAL CLIBridge over the repo's apps/ (child_process mocked, so no
// docker-compose runs) and a spy for the streaming bridge.
vi.mock('child_process', () => ({ spawn: vi.fn(), execSync: vi.fn() }));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-370-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.CLI_BRIDGE_HOST_PATH = repoRoot;

let request, express;
let requireAuth, optionalAuth;
let deployRoutes, CLIBridge;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  optionalAuth = auth.optionalAuth;
  deployRoutes = (await import('./deploy.js')).default;
  ({ CLIBridge } = await import('../cli-bridge.js'));
});

function buildApp() {
  const streamingCLIBridge = { deployApplicationWithProgress: vi.fn().mockResolvedValue({ ok: true }) };
  const app = express();
  app.use(express.json());
  app.use(deployRoutes({
    cliBridge: new CLIBridge(),
    streamingCLIBridge,
    sendError: (res, status, message) => res.status(status).json({ error: message }),
    getRequestMeta: () => ({}),
    logActivity: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    authEnabled: false,
    requireAuth,
    optionalAuth,
  }));
  return { app, streamingCLIBridge };
}

describe('POST /deploy — unfilled settings (HLCE-370)', () => {
  it('refuses CF Companion without its token and zone, naming both, and never starts it', async () => {
    const { app, streamingCLIBridge } = buildApp();
    const res = await request(app)
      .post('/deploy')
      .send({ appId: 'system-cf-companion', config: {}, mode: { type: 'standard' } });

    expect(res.status).toBe(400);
    expect(res.body.missing).toEqual(['CF_TOKEN', 'CF_ZONE_ID']);
    expect(res.body.details).toBe('Fill in CF_TOKEN, CF_ZONE_ID before deploying.');
    expect(streamingCLIBridge.deployApplicationWithProgress).not.toHaveBeenCalled();
  });

  it('counts an empty value as unfilled', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/deploy')
      .send({ appId: 'system-cf-companion', config: { CF_TOKEN: 'tok', CF_ZONE_ID: '' }, mode: { type: 'standard' } });
    expect(res.status).toBe(400);
    expect(res.body.missing).toEqual(['CF_ZONE_ID']);
  });

  it('starts the deploy once the settings are filled in', async () => {
    const { app, streamingCLIBridge } = buildApp();
    const res = await request(app)
      .post('/deploy')
      .send({ appId: 'system-cf-companion', config: { CF_TOKEN: 'tok', CF_ZONE_ID: 'zone' }, mode: { type: 'standard' } });
    expect(res.status).toBe(200);
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledTimes(1);
  });

  it('does not stop an app whose settings all have defaults (FlareSolverr)', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/deploy')
      .send({ appId: 'downloads-flaresolverr', config: {}, mode: { type: 'standard' } });
    expect(res.status).toBe(200);
  });
});

describe('POST /deploy — domain (HLCE-378)', () => {
  it('refuses a domain that is not a plain host name and never starts it', async () => {
    for (const domain of ['https://example.com', 'example.com/x', 'a`b.com', 'has space.com', '-bad.com']) {
      const { app, streamingCLIBridge } = buildApp();
      const res = await request(app)
        .post('/deploy')
        .send({ appId: 'system-cf-companion', config: { CF_TOKEN: 't', CF_ZONE_ID: 'z', domain }, mode: { type: 'standard' } });
      expect(res.status, domain).toBe(400);
      expect(res.body.error).toBe('Invalid domain');
      expect(streamingCLIBridge.deployApplicationWithProgress).not.toHaveBeenCalled();
    }
  });

  it('accepts a plain domain', async () => {
    const { app, streamingCLIBridge } = buildApp();
    const res = await request(app)
      .post('/deploy')
      .send({ appId: 'system-cf-companion', config: { CF_TOKEN: 't', CF_ZONE_ID: 'z', domain: 'home.example.com' }, mode: { type: 'standard' } });
    expect(res.status).toBe(200);
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledTimes(1);
  });
});
