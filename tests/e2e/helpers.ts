import { expect, type Page } from '@playwright/test';

// Log in through the Sign In wall and wait until the dashboard is ready.
//
// Robustness notes (these caused a fully-red E2E suite before):
//  - The deployed app requires an admin/admin login; specs must authenticate
//    before anything renders "Connected"/"Browse Mode".
//  - Playwright can fill the inputs before the React SPA has hydrated and
//    attached its onChange handlers, which silently drops the typed value
//    (the form then submits empty and stays on the login screen). We assert the
//    value actually stuck — retrying fill until it does — before submitting.
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  const username = page.locator('#login-username');
  const password = page.locator('#login-password');

  // If there's no login wall (e.g. an auto-authenticated build), skip straight
  // to the dashboard wait.
  if (await username.isVisible({ timeout: 30000 }).catch(() => false)) {
    // Retry the whole fill+submit until the login form actually goes away.
    // Two hydration races bite here: Playwright can fill before React attaches
    // onChange (value silently dropped), and can click Sign In before its handler
    // is wired (no-op click). Re-doing fill+click until the form disappears
    // survives both — far more robust than asserting field values alone.
    await expect(async () => {
      await username.fill('admin');
      await password.fill('admin');
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(username).toBeHidden({ timeout: 3000 });
    }).toPass({ timeout: 25000 });
  }

  // Dashboard is ready when it reports CLI-connected or browse mode.
  await page.waitForSelector('text=/Connected|Browse Mode/', { timeout: 30000 });
}
