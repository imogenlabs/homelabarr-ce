import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-227 (Epic HLCE-209) — security-invariant regression guard, AUTH_ENABLED=false half of AC1a.
//
// THE actual hardening this pins: even when authentication is globally
// disabled (AUTH_ENABLED=false), the container-management and enhanced-mount
// routes are STILL gated by requireAuth and return 401 to an unauthenticated
// caller. They are wired with `requireAuth` UNCONDITIONALLY — NOT the
// `authEnabled ? requireAuth : optionalAuth` pattern — so flipping AUTH_ENABLED
// off does NOT silently expose the Docker socket surface.
//
//   - server/routes/containers.js:84  router.get('/containers', requireAuth, …)
//   - server/routes/enhanced-mount.js:8 router.get('/:id/status', requireAuth, …)
//   - server/auth.js:399 requireAuth — no AUTH_ENABLED bypass; 401 when the
//     hl_session cookie is absent.
//
// If anyone later rewrites either route as `authEnabled ? requireAuth :
// optionalAuth`, the assertions below flip from 401 to 200 and this test fails.
//
// This lives in its own file because the app is a per-file singleton whose
// authEnabled flag (and the routes' middleware binding) is decided at import
// time; the auth-ENABLED invariants are in the sibling
// auth-invariants.regression.test.js. vitest isolates by file, so each file
// boots its own app under its own AUTH_ENABLED value.
//
// AUTH_ENABLED=false additionally requires BIND_ADDRESS=127.0.0.1, otherwise
// EnvironmentManager.#validateCritical (environment-manager.js:86-92) calls
// process.exit(1) at import — itself a security invariant (loopback-only when
// auth is off). We set the loopback bind so the app can boot for this test.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-authdis-'));
process.env.NODE_ENV = 'test';
process.env.AUTH_ENABLED = 'false';
process.env.BIND_ADDRESS = '127.0.0.1';
process.env.JWT_SECRET = 'a-32-plus-character-test-secret-aaaaaaaa';
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
delete process.env.SMTP_HOST;

let request, app;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
});

describe('AC1a — container & enhanced-mount routes stay 401 with AUTH_ENABLED=false', () => {
  it('GET /containers is 401 even when auth is globally disabled (containers.js:84 hard-gated)', async () => {
    const res = await request(app).get('/containers');
    // 200 here would mean the route was rewired to bypass auth when AUTH_ENABLED=false.
    expect(res.status).toBe(401);
  });

  it('GET /enhanced-mount/:id/status is 401 even when auth is globally disabled (enhanced-mount.js:8 hard-gated)', async () => {
    const res = await request(app).get('/enhanced-mount/abc123/status');
    expect(res.status).toBe(401);
  });

  it('a container mutation (DELETE) is 401 even when auth is globally disabled (containers.js:391 hard-gated)', async () => {
    const res = await request(app).delete('/containers/deadbeef');
    expect(res.status).toBe(401);
  });
});
