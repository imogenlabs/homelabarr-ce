import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-216: integration tests for server/routes/auth.js, driven end-to-end
// through the real Express app (server/index.js exports `app`; the boot/listen
// block is guarded out under NODE_ENV=test). Env must be set before index.js is
// imported because its module-level config runs at import. The app is a
// singleton with one in-memory DB + a file-backed users store for the whole
// file, so tests use distinct usernames where they mutate user/lockout state.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-authroutes-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true'; // skip the global + login limiters
delete process.env.SMTP_HOST; // email.js falls back to a no-op stub transporter

let request, app, auth, mfaMod;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
  auth = await import('../auth.js');
  mfaMod = await import('../mfa.js');
  await auth.createUser({ username: 'alice', email: 'alice@x.com', password: 'alicepass', role: 'user' });
});

// Parse a single Set-Cookie line into { value, attrs } where attrs is a
// lowercased set/map of the cookie's flags.
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

// Log in and return the supertest agent (cookie jar persisted) plus the raw
// csrf value and the path-scoped refresh cookie (the agent won't replay the
// refresh cookie to /auth/* because it's scoped to /api/auth/refresh).
async function login(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ username, password });
  const set = res.headers['set-cookie'] || [];
  const csrf = parseCookie(set, 'hl_csrf')?.value;
  const refresh = parseCookie(set, 'hl_refresh')?.value;
  return { agent, res, csrf, refresh, set };
}

describe('app harness', () => {
  it('serves /health and returns JSON 404 for unknown paths', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toHaveProperty('ok');

    const missing = await request(app).get('/definitely-not-a-route');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Not found' });
  });
});

describe('POST /auth/login — cookies & failure modes (AC1)', () => {
  it('happy path sets hl_session/hl_refresh/hl_csrf with correct flags', async () => {
    const { res, set } = await login('alice', 'alicepass');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, user: { username: 'alice' } });
    expect(res.body.user).not.toHaveProperty('password');

    const session = parseCookie(set, 'hl_session');
    expect(session.value).toBeTruthy();
    expect(session.attrs.httponly).toBe(true);
    expect(session.attrs.samesite).toBe('Strict');
    expect(session.attrs.path).toBe('/');
    expect(session.attrs.secure).toBeUndefined(); // not production

    const refresh = parseCookie(set, 'hl_refresh');
    expect(refresh.attrs.httponly).toBe(true);
    expect(refresh.attrs.samesite).toBe('Strict');
    expect(refresh.attrs.path).toBe('/api/auth/refresh'); // path-scoped

    const csrf = parseCookie(set, 'hl_csrf');
    expect(csrf.attrs.httponly).toBeUndefined(); // readable by JS (double-submit)
    expect(csrf.attrs.samesite).toBe('Strict');
    expect(csrf.attrs.path).toBe('/');
  });

  it('missing credentials → 400', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'alice' });
    expect(res.status).toBe(400);
  });

  it('bad credentials → 401 with no auth cookies', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
    const set = res.headers['set-cookie'] || [];
    expect(set.find(c => c.startsWith('hl_session='))).toBeUndefined();
  });

  it('locked account → 423 after 15 consecutive failures', async () => {
    await auth.createUser({ username: 'lockme', email: 'l@x.com', password: 'lockmepass', role: 'user' });
    for (let i = 0; i < 15; i++) {
      const r = await request(app).post('/auth/login').send({ username: 'lockme', password: 'wrong' });
      expect(r.status).toBe(401);
    }
    // Even with the correct password, the account is now locked.
    const locked = await request(app).post('/auth/login').send({ username: 'lockme', password: 'lockmepass' });
    expect(locked.status).toBe(423);
  });
});

describe('MFA-gated login (AC2)', () => {
  // Enable MFA for a dedicated user by writing its config directly.
  async function enableMfa(username) {
    const u = auth.findUserByUsername(username);
    const totp = mfaMod.newTotp(username);
    const secret = totp.secret.base32;
    const backup = mfaMod.makeBackupCodes(3);
    const backupHashes = await mfaMod.hashBackupCodes(backup);
    mfaMod.saveMfaForUser(u.id, { secret, backupHashes, enabledAt: Date.now() });
    return { totp, secret, backup };
  }

  it('login for an MFA user returns a ticket and NO session cookie', async () => {
    await auth.createUser({ username: 'mfauser', email: 'm@x.com', password: 'mfapass12', role: 'user' });
    await enableMfa('mfauser');
    const res = await request(app).post('/auth/login').send({ username: 'mfauser', password: 'mfapass12' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, mfa_required: true });
    expect(res.body.ticket).toBeTruthy();
    const set = res.headers['set-cookie'] || [];
    expect(set.find(c => c.startsWith('hl_session='))).toBeUndefined();
  });

  it('second step verifies a TOTP code and issues session cookies', async () => {
    await auth.createUser({ username: 'mfatotp', email: 'm2@x.com', password: 'mfapass12', role: 'user' });
    const { totp } = await enableMfa('mfatotp');
    const t = await request(app).post('/auth/login').send({ username: 'mfatotp', password: 'mfapass12' });
    const res = await request(app).post('/auth/login/mfa').send({ ticket: t.body.ticket, code: totp.generate() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, user: { username: 'mfatotp' } });
    const set = res.headers['set-cookie'] || [];
    expect(parseCookie(set, 'hl_session')?.value).toBeTruthy();
  });

  it('a backup code works once and is rejected on reuse (single-use)', async () => {
    await auth.createUser({ username: 'mfabak', email: 'm3@x.com', password: 'mfapass12', role: 'user' });
    const { backup } = await enableMfa('mfabak');

    const t1 = await request(app).post('/auth/login').send({ username: 'mfabak', password: 'mfapass12' });
    const ok = await request(app).post('/auth/login/mfa').send({ ticket: t1.body.ticket, backup_code: backup[0] });
    expect(ok.status).toBe(200);

    const t2 = await request(app).post('/auth/login').send({ username: 'mfabak', password: 'mfapass12' });
    const reuse = await request(app).post('/auth/login/mfa').send({ ticket: t2.body.ticket, backup_code: backup[0] });
    expect(reuse.status).toBe(401);
  });

  it('rejects an invalid/expired ticket and a wrong code', async () => {
    const bad = await request(app).post('/auth/login/mfa').send({ ticket: 'deadbeef', code: '000000' });
    expect(bad.status).toBe(401);
    const none = await request(app).post('/auth/login/mfa').send({ code: '000000' });
    expect(none.status).toBe(400);
  });

  it('a login ticket is single-use — a second /auth/login/mfa with the same ticket → 401 (HLCE-285)', async () => {
    // The ticket is consumed on the FIRST /auth/login/mfa call regardless of
    // whether the code was valid; replaying it must 401. This throttles TOTP
    // brute force: each guess needs a fresh password round-trip to mint a ticket.
    await auth.createUser({ username: 'mfaonce', email: 'mo@x.com', password: 'mfapass12', role: 'user' });
    const { totp } = await enableMfa('mfaonce');
    const t = await request(app).post('/auth/login').send({ username: 'mfaonce', password: 'mfapass12' });
    const ticket = t.body.ticket;
    expect(ticket).toBeTruthy();

    const first = await request(app).post('/auth/login/mfa').send({ ticket, code: totp.generate() });
    expect(first.status).toBe(200);

    // Same ticket again — already consumed → 401 even with a valid current code.
    const replay = await request(app).post('/auth/login/mfa').send({ ticket, code: totp.generate() });
    expect(replay.status).toBe(401);
  });
});

describe('refresh rotation & reuse detection (AC2)', () => {
  it('rotates the refresh cookie and 401s + clears cookies on reuse', async () => {
    await auth.createUser({ username: 'refresher', email: 'r@x.com', password: 'refreshpass', role: 'user' });
    const { refresh } = await login('refresher', 'refreshpass');
    expect(refresh).toBeTruthy();

    // First use rotates successfully and mints a new refresh cookie.
    const first = await request(app).post('/auth/refresh').set('Cookie', `hl_refresh=${refresh}`);
    expect(first.status).toBe(200);
    const rotated = parseCookie(first.headers['set-cookie'], 'hl_refresh')?.value;
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(refresh);

    // Replaying the original (now-consumed) refresh token is rejected.
    const reuse = await request(app).post('/auth/refresh').set('Cookie', `hl_refresh=${refresh}`);
    expect(reuse.status).toBe(401);
    const cleared = reuse.headers['set-cookie'] || [];
    expect(cleared.some(c => c.startsWith('hl_session='))).toBe(true); // clearCookie emits an expiring Set-Cookie
  });

  it('missing/garbled refresh cookies are rejected', async () => {
    const none = await request(app).post('/auth/refresh');
    expect(none.status).toBe(401);
    const bad = await request(app).post('/auth/refresh').set('Cookie', 'hl_refresh=nodothere');
    expect(bad.status).toBe(400);
  });
});

describe('session listing, deletion & logout (AC3)', () => {
  it('GET /auth/me and /auth/sessions require auth and return the current session', async () => {
    await auth.createUser({ username: 'lister', email: 'li@x.com', password: 'listerpass', role: 'user' });
    const { agent } = await login('lister', 'listerpass');

    expect((await request(app).get('/auth/me')).status).toBe(401);

    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('lister');

    const sessions = await agent.get('/auth/sessions');
    expect(sessions.status).toBe(200);
    expect(sessions.body.current_jti).toMatch(/^[a-f0-9]{32}$/);
    expect(sessions.body.sessions.some(s => s.is_current)).toBe(true);
  });

  it('DELETE /auth/sessions/:jti enforces jti format and ownership (IDOR → 404)', async () => {
    await auth.createUser({ username: 'owner', email: 'o@x.com', password: 'ownerpass', role: 'user' });
    await auth.createUser({ username: 'attacker', email: 'a@x.com', password: 'attackerpass', role: 'user' });
    const a = await login('owner', 'ownerpass');
    const ownerJti = (await a.agent.get('/auth/sessions')).body.current_jti;
    const b = await login('attacker', 'attackerpass');

    // Malformed jti → 400.
    const malformed = await b.agent.delete('/auth/sessions/not-a-jti')
      .set('x-csrf-token', b.csrf).set('x-requested-with', 'XMLHttpRequest');
    expect(malformed.status).toBe(400);

    // Well-formed but belongs to another user → 404 (no cross-user revocation).
    const idor = await b.agent.delete(`/auth/sessions/${ownerJti}`)
      .set('x-csrf-token', b.csrf).set('x-requested-with', 'XMLHttpRequest');
    expect(idor.status).toBe(404);

    // Owner's own session is still usable (was not revoked by the attacker).
    expect((await a.agent.get('/auth/me')).status).toBe(200);
  });

  it('logout revokes the session (token no longer valid) and clears cookies', async () => {
    await auth.createUser({ username: 'goodbye', email: 'g@x.com', password: 'goodbyepass', role: 'user' });
    const { agent, csrf } = await login('goodbye', 'goodbyepass');
    expect((await agent.get('/auth/me')).status).toBe(200);

    const out = await agent.post('/auth/logout')
      .set('x-csrf-token', csrf).set('x-requested-with', 'XMLHttpRequest');
    expect(out.status).toBe(200);
    const set = out.headers['set-cookie'] || [];
    expect(set.some(c => c.startsWith('hl_session='))).toBe(true); // cleared (expiring)

    // The revoked jti is no longer accepted, even though the agent still holds
    // the (now-stale) session cookie value.
    expect((await agent.get('/auth/me')).status).toBe(401);
  });

  it('CSRF/XHR guard blocks a state-changing request without the XHR header', async () => {
    await auth.createUser({ username: 'csrf', email: 'c@x.com', password: 'csrfpass12', role: 'user' });
    const { agent, csrf } = await login('csrf', 'csrfpass12');
    // hl_csrf cookie + matching header present, but no X-Requested-With → 403.
    const res = await agent.post('/auth/logout').set('x-csrf-token', csrf);
    expect(res.status).toBe(403);
  });

  it('POST /auth/sessions/revoke-all revokes every other session', async () => {
    await auth.createUser({ username: 'multi', email: 'mu@x.com', password: 'multipass12', role: 'user' });
    const a = await login('multi', 'multipass12'); // session A
    const b = await login('multi', 'multipass12'); // session B
    expect((await b.agent.get('/auth/me')).status).toBe(200);

    const res = await a.agent.post('/auth/sessions/revoke-all')
      .set('x-csrf-token', a.csrf).set('x-requested-with', 'XMLHttpRequest');
    expect(res.status).toBe(200);

    // A (current) survives; B was revoked.
    expect((await a.agent.get('/auth/me')).status).toBe(200);
    expect((await b.agent.get('/auth/me')).status).toBe(401);
  });
});

describe('change-password (AC1-adjacent)', () => {
  it('validates input, rejects a wrong current password, and rotates on success', async () => {
    await auth.createUser({ username: 'changer', email: 'ch@x.com', password: 'changerpass', role: 'user' });
    const { agent, csrf } = await login('changer', 'changerpass');
    const hdrs = (r) => r.set('x-csrf-token', csrf).set('x-requested-with', 'XMLHttpRequest');

    expect((await hdrs(agent.post('/auth/change-password')).send({ currentPassword: 'changerpass' })).status).toBe(400);
    expect((await hdrs(agent.post('/auth/change-password')).send({ currentPassword: 'changerpass', newPassword: 'short' })).status).toBe(400);
    // HLCE-268: 11-char password rejected (min length is now 12, unified with reset).
    expect((await hdrs(agent.post('/auth/change-password')).send({ currentPassword: 'changerpass', newPassword: 'elevenchars' })).status).toBe(400);
    expect((await hdrs(agent.post('/auth/change-password')).send({ currentPassword: 'wrong', newPassword: 'twelvechars1' })).status).toBe(400);

    const ok = await hdrs(agent.post('/auth/change-password')).send({ currentPassword: 'changerpass', newPassword: 'twelvechars1' });
    expect(ok.status).toBe(200);

    // The new password authenticates; the current session is kept alive.
    expect((await request(app).post('/auth/login').send({ username: 'changer', password: 'twelvechars1' })).status).toBe(200);
    expect((await agent.get('/auth/me')).status).toBe(200);
  });
});

describe('MFA setup / verify / disable (AC2-adjacent)', () => {
  it('walks setup → verify (enable) → disable end-to-end', async () => {
    await auth.createUser({ username: 'mfaflow', email: 'mf@x.com', password: 'mfaflowpass', role: 'user' });
    const { agent, csrf } = await login('mfaflow', 'mfaflowpass');
    const userId = auth.findUserByUsername('mfaflow').id;
    const hdrs = (r) => r.set('x-csrf-token', csrf).set('x-requested-with', 'XMLHttpRequest');

    // Setup returns a provisioning URI + QR and stashes a pending secret.
    const setup = await hdrs(agent.post('/auth/mfa/setup'));
    expect(setup.status).toBe(200);
    expect(setup.body.uri).toMatch(/^otpauth:\/\//);
    expect(setup.body.qr).toMatch(/^data:image\/png/);

    // It refuses a request body.
    expect((await hdrs(agent.post('/auth/mfa/setup')).send({ x: 1 })).status).toBe(400);

    // Derive a current TOTP code from the pending secret (same lib/params as
    // mfa.js: otpauth, SHA1/6/30) and verify to enable MFA.
    const pending = mfaMod.getPendingMfa(userId);
    const { TOTP, Secret } = await import('otpauth');
    const valid = new TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(pending.secret) }).generate();
    const verify = await hdrs(agent.post('/auth/mfa/verify')).send({ code: valid });
    expect(verify.status).toBe(200);
    expect(verify.body.enabled).toBe(true);
    expect(verify.body.backup_codes).toHaveLength(10);

    // verify rotates hl_csrf, so subsequent calls must use the refreshed value.
    const csrf2 = parseCookie(verify.headers['set-cookie'], 'hl_csrf')?.value || csrf;
    const hdrs2 = (r) => r.set('x-csrf-token', csrf2).set('x-requested-with', 'XMLHttpRequest');

    // Bad code shape is rejected up front.
    expect((await hdrs2(agent.post('/auth/mfa/verify')).send({ code: 'abc' })).status).toBe(400);

    // Disable requires the account password.
    expect((await hdrs2(agent.post('/auth/mfa/disable')).send({ password: 'wrong' })).status).toBe(401);
    const disabled = await hdrs2(agent.post('/auth/mfa/disable')).send({ password: 'mfaflowpass' });
    expect(disabled.status).toBe(200);
    expect(disabled.body.disabled).toBe(true);
  });

  it('MFA enroll is session-gated while disable additionally requires the password (HLCE-285)', async () => {
    // Documents the intentional asymmetry: setup/verify only need a live session
    // (you are already authenticated, so adding a second factor is low-risk),
    // but disabling a factor weakens the account and must re-prove the password.
    // Enroll endpoints reject an unauthenticated caller (session gate).
    expect((await request(app).post('/auth/mfa/setup')).status).toBe(401);
    expect((await request(app).post('/auth/mfa/verify').send({ code: '123456' })).status).toBe(401);
    // Disable is session-gated too...
    expect((await request(app).post('/auth/mfa/disable').send({ password: 'whatever' })).status).toBe(401);

    // ...and even WITH a session, disable rejects a missing/wrong password (4xx),
    // whereas setup with a session succeeds without any password.
    await auth.createUser({ username: 'mfagate', email: 'mg@x.com', password: 'mfagatepass', role: 'user' });
    const { agent, csrf } = await login('mfagate', 'mfagatepass');
    const hdrs = (r) => r.set('x-csrf-token', csrf).set('x-requested-with', 'XMLHttpRequest');

    // setup needs only the session.
    expect((await hdrs(agent.post('/auth/mfa/setup'))).status).toBe(200);
    // disable without a password is rejected (4xx — not a successful disable).
    const noPw = await hdrs(agent.post('/auth/mfa/disable')).send({});
    expect(noPw.status).toBeGreaterThanOrEqual(400);
    expect(noPw.status).toBeLessThan(500);
  });
});
