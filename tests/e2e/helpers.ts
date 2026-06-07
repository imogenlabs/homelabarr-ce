import { expect, type Page } from '@playwright/test';

// Log in through the inline Sign In screen (LoginScreen — login is a full page now,
// not a modal) and wait until the dashboard is ready. The default admin (admin/admin)
// is seeded on first boot.
//
// Hydration race: Playwright can fill the inputs before React attaches its onChange
// handlers, which silently drops the typed value. We retry the fill until the value
// actually sticks — for a controlled input that only holds once React is hydrated and
// owns the field, which also means the submit handler is wired. Then a single click
// submits; no resubmit storm.
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  const username = page.locator('#login-username');
  const password = page.locator('#login-password');

  if (await username.isVisible({ timeout: 60_000 }).catch(() => false)) {
    await expect(async () => {
      await username.fill('admin');
      await password.fill('admin');
      await expect(username).toHaveValue('admin');
      await expect(password).toHaveValue('admin');
    }).toPass({ timeout: 20_000 });

    // Submit and confirm the login form goes away. Re-click if it's still present
    // (a click landing before React wires the handler is a no-op); clicking the
    // button while it's mid-submit is harmless.
    await expect(async () => {
      if (await username.isVisible().catch(() => false)) {
        await page.getByRole('button', { name: /sign in/i }).click();
      }
      await expect(username).toBeHidden({ timeout: 5_000 });
    }).toPass({ timeout: 40_000 });
  }

  // Dashboard header is ready when it reports CLI-connected ("Connected · N apps")
  // or "Browse Mode" (no Docker backend)...
  await page.waitForSelector('text=/Connected|Browse Mode/', { timeout: 60_000 });

  // ...but the status appears before the app-card grid finishes rendering. Wait for
  // a card (a Deploy button) so card-dependent specs don't race the catalog render.
  await page.getByRole('button', { name: /deploy/i }).first().waitFor({
    state: 'visible',
    timeout: 30_000,
  });
}
