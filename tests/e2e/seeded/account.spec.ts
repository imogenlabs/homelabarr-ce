import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import {
  fillLogin,
  expectLandedOnApp,
  loginAdmin,
  openSettings,
  closeSettings,
  openApiKeys,
  logout,
} from './_helpers';

// AC3 — account self-service journeys: change-password, API-key create/revoke,
// and logout. Each is idempotent and never mutates the shared admin/admin
// credentials (change-password uses a throwaway user).

function csrfOf(cookies: { name: string; value: string }[]) {
  return cookies.find((c) => c.name === 'hl_csrf')?.value ?? '';
}
const xhr = (csrf: string) => ({ 'x-csrf-token': csrf, 'x-requested-with': 'XMLHttpRequest' });

// Admin API context for seeding/cleanup of throwaway users.
async function adminApi(baseURL: string): Promise<{ ctx: APIRequestContext; csrf: string }> {
  const ctx = await apiRequest.newContext({ baseURL });
  const login = await ctx.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
  expect(login.ok(), 'admin api login').toBeTruthy();
  const csrf = csrfOf((await ctx.storageState()).cookies);
  return { ctx, csrf };
}

async function deleteUserIfExists(ctx: APIRequestContext, csrf: string, username: string): Promise<void> {
  const res = await ctx.get('/api/auth/users', { headers: xhr(csrf) });
  if (!res.ok()) return;
  const body = await res.json();
  const existing = (body.users ?? body ?? []).find((u: { id: string; username: string }) => u.username === username);
  if (existing) await ctx.delete(`/api/auth/users/${existing.id}`, { headers: xhr(csrf) });
}

test('change password: wrong current password is rejected, correct one succeeds, new password logs in', async ({ page, baseURL }) => {
  const username = 'pwuser';
  const oldPassword = 'pwuserpass123'; // >= 12 chars
  const newPassword = 'pwuser-newpass-456'; // >= 12 chars

  // Seed a throwaway user idempotently via the admin API.
  const { ctx, csrf } = await adminApi(baseURL!);
  try {
    await deleteUserIfExists(ctx, csrf, username);
    const create = await ctx.post('/api/auth/users', {
      data: { username, email: 'pwuser@e2e.local', password: oldPassword, role: 'user' },
      headers: xhr(csrf),
    });
    expect(create.ok(), `create pwuser (${create.status()}): ${await create.text()}`).toBeTruthy();

    // Log in as the throwaway user (no MFA → lands directly) and open Settings.
    await fillLogin(page, username, oldPassword);
    await expectLandedOnApp(page);
    await openSettings(page);

    // The change-password form: 3 password inputs disambiguated by autocomplete
    // (labels aren't htmlFor-associated), submit is the form's submit button.
    const current = page.locator('input[autocomplete="current-password"]');
    const newPwInputs = page.locator('input[autocomplete="new-password"]');
    const next = newPwInputs.nth(0);
    const confirm = newPwInputs.nth(1);
    const submit = page.locator('form button[type="submit"]');

    // 1) WRONG current password → "Password Change Failed" error toast (new
    //    password is a valid length, so length isn't the blocker — the server
    //    rejects the wrong current password).
    await current.fill('totally-wrong-pass');
    await next.fill(newPassword);
    await confirm.fill(newPassword);
    await submit.click();
    await expect(page.getByText(/password change failed/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^password changed$/i)).toHaveCount(0);

    // 2) CORRECT current password + valid new password → success toast.
    await current.fill(oldPassword);
    await next.fill(newPassword);
    await confirm.fill(newPassword);
    await submit.click();
    await expect(page.getByText(/password changed/i).first()).toBeVisible({ timeout: 10_000 });

    // 3) Close Settings, log out, and re-login with the NEW password → lands on app.
    await closeSettings(page);
    await logout(page);
    await fillLogin(page, username, newPassword);
    await expectLandedOnApp(page);
  } finally {
    // Cleanup: re-auth admin (the page session is the throwaway user now).
    const cleanup = await adminApi(baseURL!);
    await deleteUserIfExists(cleanup.ctx, cleanup.csrf, username);
    await cleanup.ctx.dispose();
    await ctx.dispose();
  }
});

test('API key: generate reveals the one-time secret, revoke removes it', async ({ page }) => {
  await loginAdmin(page);
  await openApiKeys(page);

  const dialog = page.getByRole('dialog');

  // The create form may already be open if a prior run left it that way; only
  // click "Generate New Key" when the create form isn't shown yet.
  const createBtn = dialog.getByRole('button', { name: /^create$/i });
  if (!(await createBtn.isVisible().catch(() => false))) {
    await dialog.getByRole('button', { name: /generate new key/i }).click();
  }
  await createBtn.click();

  // The one-time secret string is rendered once in a <code> block.
  const secret = dialog.locator('code');
  await expect(secret).toBeVisible({ timeout: 10_000 });
  await expect(secret).toContainText(/^hlr_/);

  // The new key appears as a row (default label "Mobile App"); revoke it via the
  // trash button (icon-only, last button in the row) and confirm the empty state.
  const keyRow = dialog.locator('[class*="p-3"]').filter({ hasText: /mobile app/i }).first();
  await expect(keyRow).toBeVisible({ timeout: 10_000 });
  await keyRow.getByRole('button').last().click();
  await expect(dialog.getByText(/no api keys yet/i)).toBeVisible({ timeout: 10_000 });
});

test('logout returns to the login wall', async ({ page }) => {
  await loginAdmin(page);
  await logout(page);
  await expect(page.locator('#login-username')).toBeVisible();
});
