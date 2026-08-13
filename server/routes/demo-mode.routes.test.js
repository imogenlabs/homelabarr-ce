import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-321: integration tests for demo mode, driven end-to-end through the real
// Express app. Same harness as auth.routes.test.js — env is set before index.js
// is imported, and the app/db are a per-file singleton.
//
// Demo mode is read per request (server/demo-mode.js reads process.env at call
// time, not at import), so a test can flip it between requests against the same
// running app. That is the whole point of these tests: the SAME app must behave
// two different ways, and the "off" way must be indistinguishable from before.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-demomode-'));
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
delete process.env.DEMO_MODE;

let request, app, auth, demoMode;

beforeAll(async () => {
  request = (await import('supertest')).default;
  app = (await import('../index.js')).app;
  auth = await import('../auth.js');
  demoMode = await import('../demo-mode.js');
  await auth.createUser({ username: 'demoboss', email: 'demoboss@x.com', password: 'demobosspass12', role: 'admin' });
  await auth.createUser({ username: 'switcher', email: 'switcher@x.com', password: 'switcherpass12', role: 'admin' });
});

afterEach(() => { delete process.env.DEMO_MODE; });

function csrfOf(setCookie) {
  const line = (setCookie || []).find(c => c.startsWith('hl_csrf='));
  return line ? line.split(';')[0].split('=')[1] : undefined;
}

async function login(username, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ username, password });
  return { agent, csrf: csrfOf(res.headers['set-cookie']), status: res.status };
}

function mutate(sess, method, url) {
  return sess.agent[method](url)
    .set('x-csrf-token', sess.csrf)
    .set('x-requested-with', 'XMLHttpRequest');
}

const hashOf = (username) =>
  auth.loadUsers().find(u => u.username === username)?.password;

describe('isDemoMode (off unless explicitly on)', () => {
  // This is the single most important behaviour in the file: this code ships to
  // every self-hosted install, and anything other than an explicit opt-in must
  // leave them exactly as they were.
  it('is off when DEMO_MODE is unset', () => {
    delete process.env.DEMO_MODE;
    expect(demoMode.isDemoMode()).toBe(false);
  });

  it.each(['false', 'False', '0', '', 'no', 'off', 'yes-please', 'TRUEISH'])(
    'is off for DEMO_MODE=%j', (value) => {
      process.env.DEMO_MODE = value;
      expect(demoMode.isDemoMode()).toBe(false);
    });

  it.each(['true', 'TRUE', 'True', ' true ', '1'])(
    'is on for DEMO_MODE=%j', (value) => {
      process.env.DEMO_MODE = value;
      expect(demoMode.isDemoMode()).toBe(true);
    });
});

describe('DEMO_MODE off — behaviour is unchanged (AC1)', () => {
  it('lets a user actually change their password, and the stored hash changes', async () => {
    const sess = await login('switcher', 'switcherpass12');
    expect(sess.status).toBe(200);

    const before = hashOf('switcher');
    const res = await mutate(sess, 'post', '/auth/change-password')
      .send({ currentPassword: 'switcherpass12', newPassword: 'switcherpass34' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(hashOf('switcher')).not.toBe(before);
  });

  it('still enforces its own validation, not a demo refusal', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    const res = await mutate(sess, 'post', '/auth/change-password')
      .send({ currentPassword: 'demobosspass12', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBeUndefined();
  });
});

describe('DEMO_MODE on — account-destroying actions are refused', () => {
  it('refuses a password change and leaves the stored hash untouched (AC2)', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    process.env.DEMO_MODE = 'true';

    const before = hashOf('demoboss');
    expect(before).toBeTruthy();

    const res = await mutate(sess, 'post', '/auth/change-password')
      .send({ currentPassword: 'demobosspass12', newPassword: 'a-perfectly-valid-new-password' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('demo_mode');
    // The point of the whole ticket: not just an error, but no write.
    expect(hashOf('demoboss')).toBe(before);
  });

  it('refuses user create, delete, admin password reset and register (AC3)', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    const victim = auth.loadUsers().find(u => u.username === 'switcher');
    process.env.DEMO_MODE = 'true';

    // Sequential on purpose: a supertest agent reuses one connection, and firing
    // these concurrently resets it.
    const attempts = [
      () => mutate(sess, 'post', '/auth/users').send({ username: 'newbie', email: 'n@x.com', password: 'newbiepass12' }),
      () => mutate(sess, 'post', '/auth/register').send({ username: 'newbie2', email: 'n2@x.com', password: 'newbiepass12' }),
      () => mutate(sess, 'delete', `/auth/users/${victim.id}`),
      () => mutate(sess, 'put', `/auth/users/${victim.id}/password`).send({ new_password: 'someone-elses-password' }),
    ];

    for (const attempt of attempts) {
      const res = await attempt();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('demo_mode');
    }
    // Nobody was created and nobody was deleted.
    expect(auth.loadUsers().some(u => u.username === 'newbie')).toBe(false);
    expect(auth.loadUsers().some(u => u.username === 'newbie2')).toBe(false);
    expect(auth.loadUsers().some(u => u.id === victim.id)).toBe(true);
  });

  it('refuses API key mint and revoke, and MFA setup/verify/disable (AC4)', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    process.env.DEMO_MODE = 'true';

    const attempts = [
      () => mutate(sess, 'post', '/auth/api-keys').send({ label: 'sneaky' }),
      () => mutate(sess, 'delete', '/auth/api-keys/any-key-id'),
      () => mutate(sess, 'post', '/auth/mfa/setup'),
      () => mutate(sess, 'post', '/auth/mfa/verify').send({ code: '123456' }),
      () => mutate(sess, 'post', '/auth/mfa/disable').send({ password: 'demobosspass12' }),
    ];

    for (const attempt of attempts) {
      const res = await attempt();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('demo_mode');
    }
  });

  it('refuses the unauthenticated password-reset flow, which writes a password hash directly', async () => {
    // Not on the original list. forgot-password/reset-password bypass
    // change-password entirely and write users[idx].password, so leaving them
    // open would leave the lockout hole half-closed.
    process.env.DEMO_MODE = 'true';

    const forgot = await request(app).post('/auth/forgot-password').send({ username: 'demoboss' });
    expect(forgot.status).toBe(403);
    expect(forgot.body.code).toBe('demo_mode');

    const before = hashOf('demoboss');
    const reset = await request(app).post('/auth/reset-password')
      .send({ user_id: 'x', token: 'y', new_password: 'another-long-password' });
    expect(reset.status).toBe(403);
    expect(reset.body.code).toBe('demo_mode');
    expect(hashOf('demoboss')).toBe(before);
  });

  it('gives a human-readable reason, not a bare status (AC5)', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    process.env.DEMO_MODE = 'true';

    const res = await mutate(sess, 'post', '/auth/change-password')
      .send({ currentPassword: 'demobosspass12', newPassword: 'a-perfectly-valid-new-password' });

    expect(res.status).toBe(403);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(40);
    expect(res.body.error).toMatch(/demo/i);
    // Tells the visitor what to do rather than just saying no.
    expect(res.body.error).toMatch(/install|your own/i);
  });

  it('still lets the demo demonstrate the product (AC6)', async () => {
    const sess = await login('demoboss', 'demobosspass12');
    process.env.DEMO_MODE = 'true';

    // Signing in has to keep working or there is no demo at all.
    const fresh = await login('demoboss', 'demobosspass12');
    expect(fresh.status).toBe(200);

    const reads = [];
    for (const url of ['/auth/me', '/auth/users', '/auth/api-keys', '/auth/sessions', '/applications']) {
      reads.push(await sess.agent.get(url));
    }
    for (const res of reads) {
      expect(res.status).toBe(200);
    }
    // The catalogue is the demo's whole shop window.
    const catalog = reads[4];
    expect(catalog.body.totalApps ?? Object.keys(catalog.body.applications || {}).length).toBeTruthy();
  });

  it('does not stand in front of the auth check it sits behind', async () => {
    // demoGuard is mounted AFTER requireAuth, so an anonymous caller must still
    // be told it is unauthenticated — the refusal replaces a success, never a 401.
    process.env.DEMO_MODE = 'true';
    const res = await request(app).post('/auth/change-password')
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ currentPassword: 'a', newPassword: 'b-long-enough-password' });

    expect([401, 403]).toContain(res.status);
    expect(res.body.code).not.toBe('demo_mode');
  });
});
