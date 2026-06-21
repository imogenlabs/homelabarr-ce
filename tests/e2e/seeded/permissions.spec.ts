import { test, expect } from '@playwright/test';
import { fillLogin, expectLandedOnApp, loginAdmin, openSettings, VIEWER_USER } from './_helpers';

// AC2 — the admin-only "User Management" section of UserSettings is rendered for
// admins and hidden for non-admins. The viewer user (role `user`, no MFA) is
// seeded by the `setup` project; it logs in directly (no MFA challenge).
test.describe.configure({ mode: 'serial' });

test('a non-admin does NOT see the User Management section in Settings', async ({ page }) => {
  await fillLogin(page, VIEWER_USER.username, VIEWER_USER.password);
  await expectLandedOnApp(page);

  await openSettings(page);

  // The settings modal opened (heading present), but the admin-only User
  // Management tab is NOT rendered for a non-admin.
  await expect(page.getByRole('heading', { name: /user settings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^user management$/i })).toHaveCount(0);
});

test('an admin DOES see the User Management section in Settings', async ({ page }) => {
  await loginAdmin(page);
  await openSettings(page);

  await expect(page.getByRole('heading', { name: /user settings/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^user management$/i })).toBeVisible();
});
