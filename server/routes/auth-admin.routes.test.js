import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-216: integration tests for server/routes/auth-admin.js (admin RBAC, user
// management, password reset/forgot, cli-mint, internal audit token) driven
// through the real Express app. See auth.routes.test.js for the harness notes;
// env is set before index.js is imported and the app/db are a per-file singleton.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-authadmin-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.CLI_MINT_KEY = 'mint-key-secret-value';
process.env.INTERNAL_AUDIT_TOKEN = 'internal-audit-token-value';
delete process.env.SMTP_HOST; // email.js stub — forgot-password sends to a no-op

let request, app, auth;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
  auth = await import('../auth.js');
  await auth.createUser({ username: 'boss', email: 'boss@x.com', password: 'bosspass12', role: 'admin' });
  await auth.createUser({ username: 'peon', email: 'peon@x.com', password: 'peonpass12', role: 'user' });
});

function csrfOf(setCookie) {
  const line = (setCookie || []).find(c => c.startsWith('hl_csrf='));
  return line ? line.split(';')[0].split('=')[1] : undefined;
}

async function login(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ username, password });
  return { agent, csrf: csrfOf(res.headers['set-cookie']) };
}

// Authenticated mutating helper: attaches the CSRF header + XHR marker the
// app's CSRF/XHR guard requires for state-changing requests.
function mutate(sess, method, url) {
  return sess.agent[method](url)
    .set('x-csrf-token', sess.csrf)
    .set('x-requested-with', 'XMLHttpRequest');
}

describe('admin RBAC (AC5)', () => {
  const adminRoutes = [
    ['get', '/audit'],
    ['get', '/auth/users'],
    ['get', '/auth/activity-log'],
  ];

  it('returns 401 for unauthenticated access to admin GET routes', async () => {
    for (const [, url] of adminRoutes) {
      expect((await request(app).get(url)).status).toBe(401);
    }
  });

  it('returns 403 for a non-admin on admin routes', async () => {
    const peon = await login('peon', 'peonpass12');
    for (const [, url] of adminRoutes) {
      expect((await peon.agent.get(url)).status).toBe(403);
    }
    // A state-changing admin route also 403s for the non-admin (CSRF/XHR satisfied).
    const create = await mutate(peon, 'post', '/auth/users')
      .send({ username: 'x', email: 'x@x.com', password: 'xxxxxxxx' });
    expect(create.status).toBe(403);
  });

  it('lets an admin list users (sanitized — no password) and create/delete a user', async () => {
    const boss = await login('boss', 'bosspass12');

    const list = await boss.agent.get('/auth/users');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.every(u => !('password' in u))).toBe(true);

    const created = await mutate(boss, 'post', '/auth/users')
      .send({ username: 'tempuser', email: 't@x.com', password: 'temppass12', role: 'user' });
    expect(created.status).toBe(200);
    const id = created.body.user.id;

    const del = await mutate(boss, 'delete', `/auth/users/${id}`);
    expect(del.status).toBe(200);

    const delMissing = await mutate(boss, 'delete', '/auth/users/user_does_not_exist');
    expect(delMissing.status).toBe(404);
  });

  it('audit endpoint returns the hash-chain status and events for an admin', async () => {
    const boss = await login('boss', 'bosspass12');
    const res = await boss.agent.get('/audit');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('chain');
    expect(Array.isArray(res.body.events)).toBe(true);
  });
});

describe('forgot-password — no user enumeration (AC5)', () => {
  it('returns 204 for both an existing and a non-existing user', async () => {
    const real = await request(app).post('/auth/forgot-password').send({ username: 'boss' });
    expect(real.status).toBe(204);
    const fake = await request(app).post('/auth/forgot-password').send({ username: 'ghost-user' });
    expect(fake.status).toBe(204);
    const empty = await request(app).post('/auth/forgot-password').send({});
    expect(empty.status).toBe(204);
  });
});

describe('reset-password — replay / expiry / forgery (AC5)', () => {
  async function issueReset(username) {
    const u = auth.findUserByUsername(username);
    const raw = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    auth.saveResetToken(u.id, hash, Date.now() + 30 * 60 * 1000);
    return { userId: u.id, raw };
  }

  it('accepts a valid token once, then rejects the replay', async () => {
    await auth.createUser({ username: 'resetme', email: 're@x.com', password: 'resetmepass', role: 'user' });
    const { userId, raw } = await issueReset('resetme');

    const ok = await request(app).post('/auth/reset-password')
      .send({ user_id: userId, token: raw, new_password: 'brandnewpass12' });
    expect(ok.status).toBe(200);

    // Token was cleared on success → replay fails.
    const replay = await request(app).post('/auth/reset-password')
      .send({ user_id: userId, token: raw, new_password: 'anotherpass12' });
    expect(replay.status).toBe(400);

    // The new password actually works.
    const relog = await request(app).post('/auth/login').send({ username: 'resetme', password: 'brandnewpass12' });
    expect(relog.status).toBe(200);
  });

  it('rejects an expired token, a forged token, and a too-short password', async () => {
    await auth.createUser({ username: 'expireme', email: 'ex@x.com', password: 'expiremepass', role: 'user' });
    const u = auth.findUserByUsername('expireme');

    // Expired.
    const raw = crypto.randomBytes(32).toString('base64url');
    auth.saveResetToken(u.id, crypto.createHash('sha256').update(raw).digest('hex'), Date.now() - 1);
    const expired = await request(app).post('/auth/reset-password')
      .send({ user_id: u.id, token: raw, new_password: 'whateverpass12' });
    expect(expired.status).toBe(400);

    // Forged (valid, unexpired stored token but wrong presented value).
    const raw2 = crypto.randomBytes(32).toString('base64url');
    auth.saveResetToken(u.id, crypto.createHash('sha256').update(raw2).digest('hex'), Date.now() + 60_000);
    const forged = await request(app).post('/auth/reset-password')
      .send({ user_id: u.id, token: 'not-the-real-token', new_password: 'whateverpass12' });
    expect(forged.status).toBe(400);

    // Too-short password (< 12 chars).
    const short = await request(app).post('/auth/reset-password')
      .send({ user_id: u.id, token: raw2, new_password: 'short' });
    expect(short.status).toBe(400);

    // Missing fields.
    const missing = await request(app).post('/auth/reset-password').send({ user_id: u.id });
    expect(missing.status).toBe(400);
  });
});

describe('cli-mint token endpoint (AC4)', () => {
  it('rejects missing, wrong, and wrong-length mint keys with 403 (no crash)', async () => {
    const missing = await request(app).post('/auth/cli-mint').send({ u: 'scanbot' });
    expect(missing.status).toBe(403);

    const wrong = await request(app).post('/auth/cli-mint')
      .set('X-Mint-Key', 'wrong-key-same-length').send({ u: 'scanbot' });
    expect(wrong.status).toBe(403);

    // Different length exercises the timingSafeEqual length-mismatch throw path.
    const wrongLen = await request(app).post('/auth/cli-mint')
      .set('X-Mint-Key', 'x').send({ u: 'scanbot' });
    expect(wrongLen.status).toBe(403);
  });

  it('mints a token for a valid request and validates role/ttl/username', async () => {
    const key = process.env.CLI_MINT_KEY;
    const ok = await request(app).post('/auth/cli-mint')
      .set('X-Mint-Key', key).send({ u: 'scanbot', role: 'scanner', ttl_s: 600 });
    expect(ok.status).toBe(200);
    expect(ok.body.a).toBeTruthy();
    expect(ok.body.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Invalid username.
    expect((await request(app).post('/auth/cli-mint').set('X-Mint-Key', key).send({ u: 'ab' })).status).toBe(400);
    // Invalid role.
    expect((await request(app).post('/auth/cli-mint').set('X-Mint-Key', key).send({ u: 'scanbot', role: 'admin' })).status).toBe(400);
    // ttl out of range.
    expect((await request(app).post('/auth/cli-mint').set('X-Mint-Key', key).send({ u: 'scanbot', ttl_s: 10 })).status).toBe(400);
    expect((await request(app).post('/auth/cli-mint').set('X-Mint-Key', key).send({ u: 'scanbot', ttl_s: 99999 })).status).toBe(400);
  });
});

describe('internal audit token endpoint (AC4)', () => {
  it('is guarded by X-Internal-Token and validates the event body', async () => {
    expect((await request(app).post('/internal/audit').send({ event: 'x' })).status).toBe(403);
    expect((await request(app).post('/internal/audit').set('X-Internal-Token', 'nope').send({ event: 'x' })).status).toBe(403);

    const tok = process.env.INTERNAL_AUDIT_TOKEN;
    const ok = await request(app).post('/internal/audit').set('X-Internal-Token', tok).send({ event: 'cron.tick', meta: { n: 1 } });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true });

    const noEvent = await request(app).post('/internal/audit').set('X-Internal-Token', tok).send({});
    expect(noEvent.status).toBe(400);
  });
});

describe('admin user management & activity log (AC5)', () => {
  it('admin can reset a user password and register a new user', async () => {
    const boss = await login('boss', 'bosspass12');
    await auth.createUser({ username: 'resettarget', email: 'rt@x.com', password: 'resettarget1', role: 'user' });
    const id = auth.findUserByUsername('resettarget').id;

    // Too-short password.
    expect((await mutate(boss, 'put', `/auth/users/${id}/password`).send({ newPassword: 'short' })).status).toBe(400);
    // Missing user.
    expect((await mutate(boss, 'put', '/auth/users/nope/password').send({ newPassword: 'longenough12' })).status).toBe(404);
    // Success — the new password authenticates.
    expect((await mutate(boss, 'put', `/auth/users/${id}/password`).send({ newPassword: 'longenough12' })).status).toBe(200);
    expect((await request(app).post('/auth/login').send({ username: 'resettarget', password: 'longenough12' })).status).toBe(200);

    // Register a brand-new user (admin only).
    const reg = await mutate(boss, 'post', '/auth/register').send({ username: 'registered', password: 'registered12', email: 'rg@x.com', role: 'user' });
    expect(reg.status).toBe(200);
    expect(reg.body.success).toBe(true);
    // Missing required fields.
    expect((await mutate(boss, 'post', '/auth/register').send({ username: 'x' })).status).toBe(400);
  });

  it('admin can read the activity log', async () => {
    const boss = await login('boss', 'bosspass12');
    const res = await boss.agent.get('/auth/activity-log');
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });
});

describe('API keys & starred apps (per-user)', () => {
  it('creates, lists, and revokes an API key', async () => {
    const peon = await login('peon', 'peonpass12');

    const created = await mutate(peon, 'post', '/auth/api-keys').send({ label: 'ci' });
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^hlr_/);
    const id = created.body.id;

    const list = await peon.agent.get('/auth/api-keys');
    expect(list.status).toBe(200);
    expect(list.body.apiKeys.some(k => k.id === id)).toBe(true);

    expect((await mutate(peon, 'delete', `/auth/api-keys/${id}`)).status).toBe(200);
    expect((await mutate(peon, 'delete', '/auth/api-keys/nonexistent')).status).toBe(404);
  });

  it('stars and unstars apps for the current user', async () => {
    const peon = await login('peon', 'peonpass12');

    const empty = await peon.agent.get('/auth/me/stars');
    expect(empty.status).toBe(200);
    expect(Array.isArray(empty.body.stars)).toBe(true);

    const star = await mutate(peon, 'post', '/auth/me/stars/plex');
    expect(star.status).toBe(200);
    expect(star.body.stars).toContain('plex');

    const unstar = await mutate(peon, 'delete', '/auth/me/stars/plex');
    expect(unstar.status).toBe(200);
    expect(unstar.body.stars).not.toContain('plex');
  });
});
