import { describe, it, expect, beforeAll, vi } from 'vitest';

// HLCE-265: /health/detail must NOT return HTTP 200 when its own handler errors.
// It previously did `sendError(res, 200, ...)` in the catch, so a broken health
// endpoint read as healthy to monitoring. We mount the route factory directly
// with collaborators that force the in-`try` path to throw and assert 500.
process.env.NODE_ENV = 'test';

let request, express, healthRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  healthRoutes = (await import('../routes/health.js')).default;
});

function buildApp(overrides = {}) {
  const app = express();
  app.use(express.json());
  const deps = {
    requireAuth: (req, _res, next) => { req.user = { id: 'admin', username: 'admin', role: 'admin' }; next(); },
    requireRole: () => (_req, _res, next) => next(),
    sendError: (res, status, message) => res.status(status).json({ error: message }),
    dockerManager: {
      getConnectionState: () => ({ isConnected: false }),
      getServiceStatus: () => ({ status: 'available', message: 'ok' }),
      classifyError: (e) => ({ type: 'docker_error', message: e.message }),
      executeWithRetry: async () => null,
    },
    envConfig: { environment: 'test' },
    networkConfig: {},
    EnvironmentManager: {
      // Forces the failure inside the handler's try (health.js:93).
      validateConfiguration: () => { throw new Error('boom: validateConfiguration failed'); },
      getCorsOptions: () => ({}),
      isContainerized: () => false,
    },
    NetworkManager: { validateNetworkConfiguration: () => ({ isValid: true, errors: [] }) },
    DeploymentLogger: { logStartupInfo: () => {} },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    isDevelopment: false,
    getProcessCounters: () => ({}),
    ...overrides,
  };
  app.use(healthRoutes(deps));
  return app;
}

describe('HLCE-265 — /health/detail surfaces failures as non-2xx', () => {
  it('returns 500 (not 200) when the handler throws internally', async () => {
    const res = await request(buildApp()).get('/health/detail');
    expect(res.status).toBe(500);
    expect(res.status).not.toBe(200);
  });
});
