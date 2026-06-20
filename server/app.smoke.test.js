// Harness smoke test: proves server/index.js exports `app` and that supertest
// can drive it in-process (no port bound, no process.exit during config
// validation) under NODE_ENV=test. Delete once real route integration tests exist.
import { describe, it, expect, beforeAll } from 'vitest';

// Must be set before importing index.js (module-level config runs at import).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.AUDIT_DIR = '/tmp/hlce-audit-smoke';

let request;
let app;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('./index.js')).app;
});

describe('backend test harness', () => {
  it('exports an Express app that supertest can drive in-process', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok');
  });

  it('returns JSON 404 for unknown paths', async () => {
    const res = await request(app).get('/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
