import { expect, type Page } from '@playwright/test';

// Persisted-session file for the live smoke lane (gitignored). The `smoke-setup`
// project logs in once and writes it; the smoke specs reuse it via storageState
// so the suite makes a single login instead of one per test. (HLCE-295.)
export const SMOKE_STATE_FILE = 'tests/e2e/.smoke-auth.json';

// Ensure we land on the authenticated dashboard. With a reused session
// (storageState) the dashboard renders immediately and we skip the login form;
// without one we log in through the inline Sign In screen. We race the login form
// against the dashboard so the already-authenticated path stays fast (no waiting
// out the full login-form timeout on every test).
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  const username = page.locator('#login-username');
  const password = page.locator('#login-password');
  const dashboard = page.locator('text=/Connected|Browse Mode/').first();

  // Whichever appears first: the login wall, or the already-authenticated dashboard.
  await expect(username.or(dashboard).first()).toBeVisible({ timeout: 20_000 });

  if (await username.isVisible()) {
    await expect(async () => {
      await username.fill('admin');
      await password.fill('admin');
      await expect(username).toHaveValue('admin');
      await expect(password).toHaveValue('admin');
    }).toPass({ timeout: 10_000 });

    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(username).toBeHidden({ timeout: 15_000 });
  }

  await page.waitForSelector('text=/Connected|Browse Mode/', { timeout: 20_000 });
}
