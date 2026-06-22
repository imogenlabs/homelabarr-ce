import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-227 (Epic HLCE-209) — PERMANENT security-invariant regression guards.
//
// These are ASSERT-ONLY guardrails: each test is written so that it FAILS if
// the security control it pins is weakened or removed. They drive the real
// Express app end-to-end via supertest (mirroring the HLCE-216 harness in
// server/routes/auth.routes.test.js) so they exercise the production wiring,
// not a mock of it.
//
// Scope of THIS file (auth ENABLED, the default): AC1a (containers +
// enhanced-mount routes hard-gated by requireAuth), AC1b (boot guard exits on
// a short JWT secret), AC2a (login leaks no token in the body), AC2b (CSRF /
// XHR double-submit guard rejects state-changing requests).
//
// The AUTH_ENABLED=false half of AC1a lives in
// server/regression/auth-disabled-invariants.regression.test.js — the app is a
// per-file singleton whose authEnabled flag is read at import, so the two boot
// configurations cannot coexist in one file.
//
// Env must be set BEFORE index.js is imported: its module-level config runs at
// import time. (This file sits at server/regression/, so the app is ../index.js.)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-authinv-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a-32-plus-character-test-secret-aaaaaaaa';
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
delete process.env.SMTP_HOST; // email.js falls back to a no-op stub transporter

let request, app, auth;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
  auth = await import('../auth.js');
  await auth.createUser({ username: 'inv-user', email: 'inv@x.com', password: 'invpassword', role: 'user' });
});

function parseCookie(setCookieArr, name) {
  const line = (setCookieArr || []).find(c => c.startsWith(name + '='));
  if (!line) return null;
  const parts = line.split(';').map(s => s.trim());
  const value = parts[0].slice(name.length + 1);
  const attrs = {};
  for (const p of parts.slice(1)) {
    const [k, v] = p.split('=');
    attrs[k.toLowerCase()] = v === undefined ? true : v;
  }
  return { value, attrs };
}

async function login(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ username, password });
  const set = res.headers['set-cookie'] || [];
  const csrf = parseCookie(set, 'hl_csrf')?.value;
  return { agent, res, csrf, set };
}

// ---------------------------------------------------------------------------
// AC1a — container & enhanced-mount routes are gated by requireAuth
// UNCONDITIONALLY. Control: routes are wired as `requireAuth` (NOT the
// `authEnabled ? requireAuth : optionalAuth` pattern) in
//   - server/routes/containers.js (router.get('/containers', requireAuth, …))
//   - server/routes/enhanced-mount.js (router.get('/:id/status', requireAuth, …))
// and requireAuth itself has no AUTH_ENABLED bypass (server/auth.js:399 — it
// returns 401 whenever the hl_session cookie / API key is absent). This file
// runs with auth ENABLED and asserts an unauthenticated request is 401; the
// AUTH_ENABLED=false counterpart (the actual hardening this pins) is in the
// sibling auth-disabled file. Hardening origin: cookie-only JWT auth (C-R2.5-1).
// ---------------------------------------------------------------------------
describe('AC1a — container & enhanced-mount routes require auth (no auth bypass)', () => {
  it('GET /containers is 401 without a session cookie (containers.js:84)', async () => {
    const res = await request(app).get('/containers');
    expect(res.status).toBe(401);
  });

  it('GET /enhanced-mount/:id/status is 401 without a session cookie (enhanced-mount.js:8)', async () => {
    const res = await request(app).get('/enhanced-mount/abc123/status');
    expect(res.status).toBe(401);
  });

  it('a valid session reaches the container route (proves the 401s above are the guard, not a 404)', async () => {
    const { agent } = await login('inv-user', 'invpassword');
    const res = await agent.get('/containers');
    expect(res.status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// AC1b — the startup guard fails CLOSED on a weak JWT secret. Control:
// EnvironmentManager.#validateCritical (server/environment-manager.js:79-84)
// calls process.exit(1) when jwtSecret is missing or < 32 chars. Hardening
// origin: JWT_SECRET length gate (also covered as a happy-path unit in
// HLCE-220's environment-manager.test.js — re-asserted here as a named,
// permanent security invariant). vi.resetModules() loads a fresh EM with its
// own #initialized flag so the singleton from index.js above is untouched.
// ---------------------------------------------------------------------------
describe('AC1b — boot guard process.exit(1) on a JWT secret under 32 chars', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

  it('process.exit(1) when JWT_SECRET is < 32 chars (environment-manager.js:80-83)', async () => {
    const savedSecret = process.env.JWT_SECRET;
    const savedNodeEnv = process.env.NODE_ENV;
    vi.resetModules();
    process.env.JWT_SECRET = 'short-secret'; // 12 chars, under the 32 floor
    process.env.NODE_ENV = 'production';
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // Fresh module after resetModules → a brand-new class with its own
      // #initialized flag, so getConfiguration() runs the guard from scratch
      // and never touches the app singleton imported above.
      const { EnvironmentManager } = await import('../environment-manager.js');
      EnvironmentManager.getConfiguration();
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      process.env.JWT_SECRET = savedSecret;
      process.env.NODE_ENV = savedNodeEnv;
    }
  });
});

// ---------------------------------------------------------------------------
// AC2a — login issues the JWT ONLY as an HttpOnly Set-Cookie (hl_session) and
// NEVER returns it in the JSON body. Control: server/routes/auth.js:80 sets the
// httpOnly hl_session cookie; the body at auth.js:105 is `{ success, user }` —
// no token field. Hardening origin: cookie-only JWT auth (C-R2.5-1), to keep
// the session token out of JS-readable / XSS-exfiltratable surfaces.
// ---------------------------------------------------------------------------
describe('AC2a — login returns no token in the body, only an HttpOnly cookie', () => {
  it('JSON body carries no token/accessToken/jwt and hl_session is HttpOnly (auth.js:80,105)', async () => {
    const { res, set } = await login('inv-user', 'invpassword');
    expect(res.status).toBe(200);

    // Body must not leak the bearer token under any of the usual field names.
    expect(res.body).not.toHaveProperty('token');
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('access_token');
    expect(res.body).not.toHaveProperty('jwt');
    // Defensive: no string value in the body should look like a JWT (xxx.yyy.zzz).
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);

    // The session token IS delivered, but only as an HttpOnly cookie.
    const session = parseCookie(set, 'hl_session');
    expect(session?.value).toBeTruthy();
    expect(session.attrs.httponly).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC2b — a state-changing request from an authenticated browser session is
// rejected (403) unless it carries BOTH the CSRF double-submit (x-csrf-token
// matching the hl_csrf cookie) AND x-requested-with: XMLHttpRequest. Control:
// the global guard at server/index.js:135-160. Hardening origin: CSRF
// double-submit + XHR-required guard.
// ---------------------------------------------------------------------------
describe('AC2b — CSRF/XHR double-submit guard on state-changing requests', () => {
  it('authenticated POST without x-requested-with is 403 (index.js:155-156)', async () => {
    const { agent, csrf } = await login('inv-user', 'invpassword');
    // Correct CSRF token, but the XHR header is missing → rejected.
    const res = await agent.post('/auth/logout').set('x-csrf-token', csrf);
    expect(res.status).toBe(403);
  });

  it('authenticated POST with a mismatched x-csrf-token is 403 (index.js:144-145)', async () => {
    const { agent, csrf } = await login('inv-user', 'invpassword');
    const res = await agent
      .post('/auth/logout')
      .set('x-csrf-token', csrf + 'tampered')
      .set('x-requested-with', 'XMLHttpRequest');
    expect(res.status).toBe(403);
  });

  it('the same POST WITH both the matching CSRF token and the XHR header is allowed', async () => {
    const { agent, csrf } = await login('inv-user', 'invpassword');
    const res = await agent
      .post('/auth/logout')
      .set('x-csrf-token', csrf)
      .set('x-requested-with', 'XMLHttpRequest');
    expect(res.status).toBe(200);
  });

  it('an authed POST with the XHR header but NO x-csrf-token is 403 — double-submit is MANDATORY (HLCE-283)', async () => {
    // Regression for HLCE-283: previously the CSRF compare only ran when BOTH the
    // cookie AND the header were present, so a missing x-csrf-token fell through
    // to the weaker XHR-only gate and a forged XHR was accepted (200). The token
    // is now mandatory: a missing/empty header is a hard 403.
    const { agent } = await login('inv-user', 'invpassword');
    const res = await agent
      .post('/auth/logout')
      .set('x-requested-with', 'XMLHttpRequest'); // valid session cookie, but NO x-csrf-token
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'CSRF validation failed' });
  });

  it('an authed POST with an EMPTY x-csrf-token is also 403 (no empty-string bypass, HLCE-283)', async () => {
    const { agent } = await login('inv-user', 'invpassword');
    const res = await agent
      .post('/auth/logout')
      .set('x-requested-with', 'XMLHttpRequest')
      .set('x-csrf-token', '');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'CSRF validation failed' });
  });
});
