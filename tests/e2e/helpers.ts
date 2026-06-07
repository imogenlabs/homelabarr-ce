import { expect, type Page } from '@playwright/test';

// Log in through the inline Sign In screen and wait for the dashboard.
//
// We log in per test rather than reuse a saved session: the app logs you out on
// reload (GET /api/auth/me returns the user flat, but AuthContext reads data.user),
// so storageState / session-reuse lands back on the login wall. The login response
// itself is correct, so a fresh UI login works. ce-dev is warm so this is fast; we
// still retry the fill until the value sticks to survive any hydration race.
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  const username = page.locator('#login-username');
  const password = page.locator('#login-password');

  if (await username.isVisible({ timeout: 20_000 }).catch(() => false)) {
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
