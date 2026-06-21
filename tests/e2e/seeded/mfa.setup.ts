import { test as setup, expect, request as apiRequest } from '@playwright/test';
import { URI, TOTP } from 'otpauth';
import fs from 'node:fs';
import { MFA_FILE, VIEWER_USER } from './_helpers';

// Seeds an MFA-enabled user on the seeded target via the API, so the MFA LOGIN
// journey (auth.spec.ts) is deterministic. There is no MFA-enable UI in the app
// (MFA is backend-only; only the login side has UI), so enabling it is done
// here through /auth/mfa/setup + /auth/mfa/verify, exactly as a client would.
//
// Writes the user's TOTP secret + one backup code to .seeded-mfa.json (gitignored)
// for the spec to read. Assumes a FRESH stack (mfauser does not yet exist); the
// E2E compose is brought up with `down -v` between runs.
const MFA_USER = { username: 'mfauser', email: 'mfauser@e2e.local', password: 'mfapass123' };

function csrfOf(cookies: { name: string; value: string }[]) {
  return cookies.find((c) => c.name === 'hl_csrf')?.value ?? '';
}
const xhr = (csrf: string) => ({ 'x-csrf-token': csrf, 'x-requested-with': 'XMLHttpRequest' });

// Log in as admin, retrying through transient backend unavailability. The seeded
// backend polls container stats with a blocking `docker stats` sweep over every
// container on the shared host, which can intermittently make it unresponsive
// (502/timeout) for a few seconds at a time. Retry so seeding is robust to that
// flap instead of failing the whole run on a single unlucky request.
async function loginAdminApi(baseURL: string) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 20; attempt++) {
    const ctx = await apiRequest.newContext({ baseURL });
    try {
      const res = await ctx.post('/api/auth/login', {
        data: { username: 'admin', password: 'admin' },
        timeout: 8000,
      });
      if (res.ok()) {
        const csrf = csrfOf((await ctx.storageState()).cookies);
        if (csrf) return { ctx, csrf };
      }
      lastErr = new Error(`login status ${res.status()}`);
    } catch (err) {
      lastErr = err;
    }
    await ctx.dispose();
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`admin login never succeeded: ${String(lastErr)}`);
}

setup('seed an MFA-enabled user', async ({ baseURL }) => {
  setup.setTimeout(120_000); // tolerate backend stats-sweep flap (retried logins)

  // 1) Admin creates the MFA user (idempotent: a 4xx "already exists" is fine on
  //    a non-fresh stack — what matters is that mfauser can log in below).
  const { ctx: admin, csrf: adminCsrf } = await loginAdminApi(baseURL!);

  // Idempotent: drop any pre-existing mfauser (and its MFA state) so each run
  // starts from a clean, MFA-disabled account regardless of prior runs.
  const listRes = await admin.get('/api/auth/users', { headers: xhr(adminCsrf) });
  if (listRes.ok()) {
    const list = await listRes.json();
    const existing = (list.users ?? list ?? []).find((u: { id: string; username: string }) => u.username === MFA_USER.username);
    if (existing) {
      await admin.delete(`/api/auth/users/${existing.id}`, { headers: xhr(adminCsrf) });
    }
  }

  const createRes = await admin.post('/api/auth/users', { data: { ...MFA_USER, role: 'user' }, headers: xhr(adminCsrf) });
  expect(createRes.ok(), `create mfauser failed (${createRes.status()}): ${await createRes.text()}`).toBeTruthy();
  await admin.dispose();

  // 2) The MFA user enables TOTP: setup → derive code → verify → capture backup codes.
  const user = await apiRequest.newContext({ baseURL });
  const userLogin = await user.post('/api/auth/login', { data: { username: MFA_USER.username, password: MFA_USER.password } });
  expect(userLogin.ok(), 'mfauser login').toBeTruthy();
  const userCsrf = csrfOf((await user.storageState()).cookies);

  const setupRes = await user.post('/api/auth/mfa/setup', { headers: xhr(userCsrf) });
  expect(setupRes.ok(), 'mfa setup').toBeTruthy();
  const { uri } = await setupRes.json();
  const totp = URI.parse(uri) as TOTP;
  const secret = new URL(uri).searchParams.get('secret') ?? '';

  const verifyRes = await user.post('/api/auth/mfa/verify', { data: { code: totp.generate() }, headers: xhr(userCsrf) });
  expect(verifyRes.ok(), 'mfa verify').toBeTruthy();
  const { backup_codes } = await verifyRes.json();
  await user.dispose();

  expect(secret, 'parsed TOTP secret').toBeTruthy();
  expect(Array.isArray(backup_codes) && backup_codes.length > 0, 'backup codes returned').toBeTruthy();

  fs.writeFileSync(
    MFA_FILE,
    JSON.stringify({ ...MFA_USER, secret, backupCode: backup_codes[0] }, null, 2),
  );
});

// Seeds a plain non-admin user (role `user`, no MFA) for the permissions spec.
// Idempotent: delete any pre-existing `viewer` then create, so each run starts
// from a clean account regardless of prior runs on the shared target.
setup('seed a non-admin user', async ({ baseURL }) => {
  setup.setTimeout(120_000); // tolerate backend stats-sweep flap (retried logins)
  const { ctx: admin, csrf: adminCsrf } = await loginAdminApi(baseURL!);

  const listRes = await admin.get('/api/auth/users', { headers: xhr(adminCsrf) });
  if (listRes.ok()) {
    const list = await listRes.json();
    const existing = (list.users ?? list ?? []).find((u: { id: string; username: string }) => u.username === VIEWER_USER.username);
    if (existing) {
      await admin.delete(`/api/auth/users/${existing.id}`, { headers: xhr(adminCsrf) });
    }
  }

  const createRes = await admin.post('/api/auth/users', {
    data: { ...VIEWER_USER, role: 'user' },
    headers: xhr(adminCsrf),
  });
  expect(createRes.ok(), `create viewer failed (${createRes.status()}): ${await createRes.text()}`).toBeTruthy();
  await admin.dispose();
});
