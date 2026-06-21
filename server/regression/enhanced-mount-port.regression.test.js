import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// HLCE-267: every enhanced-mount handler must validate the container-reported
// web port before fetching localhost — not just enable/disable. We mount the
// factory with a dockerManager whose container reports a given HostPort and
// assert: out-of-range → handled error + NO fetch; valid → fetch proxied.
process.env.NODE_ENV = 'test';

let request, express, enhancedMountRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  enhancedMountRoutes = (await import('../routes/enhanced-mount.js')).default;
});

function buildApp(hostPort) {
  const container = {
    inspect: vi.fn().mockResolvedValue({
      NetworkSettings: { Ports: { '8080/tcp': [{ HostPort: hostPort }] } },
    }),
  };
  const deps = {
    requireAuth: (req, _res, next) => { req.user = { id: 'u', role: 'admin' }; next(); },
    sendError: (res, status, message) => res.status(status).json({ error: message }),
    dockerManager: { getDocker: () => ({ getContainer: () => container }) },
  };
  const app = express();
  app.use(express.json());
  app.use('/enhanced-mount', enhancedMountRoutes(deps));
  return app;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});
afterEach(() => vi.unstubAllGlobals());

describe('HLCE-267 — enhanced-mount port guard on all handlers', () => {
  it('GET /status rejects an out-of-range container port without fetching', async () => {
    const res = await request(buildApp('999999')).get('/enhanced-mount/cid/status');
    expect(res.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('POST /auth/start rejects a non-numeric container port without fetching', async () => {
    const res = await request(buildApp('not-a-port')).post('/enhanced-mount/cid/auth/start').send({});
    expect(res.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('GET /status proxies to the validated port when it is valid', async () => {
    const res = await request(buildApp('18080')).get('/enhanced-mount/cid/status');
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('http://localhost:18080/api/v2/status');
  });
});
