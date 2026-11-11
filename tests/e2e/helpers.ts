import { expect, type Page } from '@playwright/test';

// Persisted-session file for the live smoke lane (gitignored). The `smoke-setup`
// project logs in once and writes it; the smoke specs reuse it via storageState
// so the suite makes a single login instead of one per test. (HLCE-295.)
export const SMOKE_STATE_FILE = 'tests/e2e/.smoke-auth.json';

// The live target allows 100 requests a minute per address (globalRateLimit in
// server/index.js), and one dashboard load makes about 7. Back to back, the 18
// smoke tests made ~110 a minute and the last ones were refused with 429, which
// the dashboard shows as the login screen (HLCE-379). Spacing loads 6 s apart
// keeps a run near 70 a minute. A time gap, not a counter: a retry starts a new
// worker with fresh module state, and a gap still holds there.
const MIN_GAP_BETWEEN_LOADS_MS = 6_000;
let lastLoadAt = 0;

async function waitForLoadSlot(): Promise<void> {
  const wait = lastLoadAt + MIN_GAP_BETWEEN_LOADS_MS - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastLoadAt = Date.now();
}

// Ensure we land on the authenticated dashboard. With a reused session
// (storageState) the dashboard renders immediately and we skip the login form;
// without one we log in through the inline Sign In screen. We race the login form
// against the dashboard so the already-authenticated path stays fast (no waiting
// out the full login-form timeout on every test).
export async function login(page: Page): Promise<void> {
  await waitForLoadSlot();
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
