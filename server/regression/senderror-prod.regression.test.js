import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-227 (Epic HLCE-209) — AC4d: sendError must NOT leak internal error detail
// in production. ASSERT-ONLY guardrail: the test fails if the env gate is removed.
//
// THE CONTROL (server/index.js):
//   const isDevelopment = envConfig.environment === 'development';   // index.js:43
//   function sendError(res, status, message, internalError) {       // index.js:164
//     if (internalError) { logger.error(message, { ...stack... }); } //  -> logs only
//     const body = { error: message };
//     if (isDevelopment && internalError) {                          // index.js:169
//       body.details = internalError.message || String(internalError);
//     }
//     res.status(status).json(body);
//   }
// So in production `isDevelopment` is false and `body.details` is NEVER attached;
// the internal error message/stack stays in the server log, not the HTTP response.
//
// WHY A SEPARATE FILE: envConfig is built ONCE at first import and cached
// (EnvironmentManager.#initialized), and `environment` derives purely from
// NODE_ENV (detectEnvironment: only 'production'/'prod' yield 'production'). The
// app is a per-process singleton, so the production-mode app cannot share a file
// with a development-mode app — hence this prod-only file. The sibling seal tests
// live in cli-bridge-seals.regression.test.js.
//
// NODE_ENV='production' (not 'test') runs index.js's bootstrap block (listen +
// config validation). We satisfy production validation so it does not exit:
// JWT_SECRET >= 32 chars, CORS_ORIGIN set, AUTH_ENABLED=false bound to loopback
// (validateCritical requires 127.0.0.1 when auth is off), and PORT=0 so listen()
// grabs an ephemeral port instead of colliding.
//
// THE TRIGGER ROUTE: POST /applications/:appId/stop runs with optionalAuth when
// AUTH_ENABLED=false, so it is reachable unauthenticated. A malicious appId makes
// cliBridge.stopApplication() throw "Invalid path component: ..." (an INTERNAL
// detail), which the route's catch forwards to
//   sendError(res, 500, 'Failed to stop application', error)   // applications.js:63
// In dev the body would carry `details: 'Invalid path component: "a/b"'`; in prod
// it must carry ONLY the generic message. (Verified empirically: dev leaks, prod
// does not — so this assertion is load-bearing.)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-senderror-prod-'));
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.AUTH_ENABLED = 'false';
process.env.BIND_ADDRESS = '127.0.0.1';
process.env.CORS_ORIGIN = 'https://example.com';
process.env.PORT = '0';
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.CLI_BRIDGE_HOST_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
delete process.env.SMTP_HOST;

let request, app;
beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
});

describe('AC4d — sendError production leak seal (server/index.js:169)', () => {
  // Drive a route whose internal error message is a recognizable secret-ish string
  // ("Invalid path component") so a leak would be unambiguous in the response body.
  async function triggerInternalError() {
    return request(app)
      .post(`/applications/${encodeURIComponent('a/b-x')}/stop`)
      .send({});
  }

  it('confirms the app booted in production mode', async () => {
    // /health proves the app is mounted and serving (sanity for the harness).
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });

  it('returns the generic message and 500 for an internally-failing request', async () => {
    const res = await triggerInternalError();
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to stop application');
  });

  it('does NOT attach a `details` field in production', async () => {
    const res = await triggerInternalError();
    // In development this field carries internalError.message; in production the
    // isDevelopment gate (index.js:169) must keep it off the wire entirely.
    expect(res.body).not.toHaveProperty('details');
  });

  it('does NOT leak the internal error message or stack anywhere in the response body', async () => {
    const res = await triggerInternalError();
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/Invalid path component/);
    expect(serialized).not.toMatch(/Path traversal/);
    expect(serialized).not.toMatch(/at .*cli-bridge\.js/); // no stack frames
    expect(serialized).not.toMatch(/\bstack\b/i);
  });

  it('the only response key is `error` (closed body shape, no detail bleed)', async () => {
    const res = await triggerInternalError();
    expect(Object.keys(res.body)).toEqual(['error']);
  });
});
