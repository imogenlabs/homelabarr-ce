import { test as setup, expect, request as apiRequest } from '@playwright/test';
import { URI, TOTP } from 'otpauth';
import fs from 'node:fs';
import { MFA_FILE } from './_helpers';

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

setup('seed an MFA-enabled user', async ({ baseURL }) => {
  // 1) Admin creates the MFA user (idempotent: a 4xx "already exists" is fine on
  //    a non-fresh stack — what matters is that mfauser can log in below).
  const admin = await apiRequest.newContext({ baseURL });
  const adminLogin = await admin.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
  expect(adminLogin.ok(), 'admin login').toBeTruthy();
  const adminCsrf = csrfOf((await admin.storageState()).cookies);
  expect(adminCsrf, 'admin csrf cookie captured').toBeTruthy();

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
