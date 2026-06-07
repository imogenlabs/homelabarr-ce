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
//
// Timeouts are generous because the FIRST load is slow on a shared CI runner: the
// production bundle has to download, parse and hydrate while the backend, the Vite
// preview server and the browser all compete for 2 cores — observed ~60s to an
// interactive login form. The `warmup` project pays this cost once; afterwards the
// preview server and OS cache are warm and every spec logs in in a couple of seconds.
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  const username = page.locator('#login-username');
  const password = page.locator('#login-password');

  if (await username.isVisible({ timeout: 120_000 }).catch(() => false)) {
    await expect(async () => {
      await username.fill('admin');
      await password.fill('admin');
      await expect(username).toHaveValue('admin');
      await expect(password).toHaveValue('admin');
    }).toPass({ timeout: 30_000 });

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

  await waitForDashboard(page);
}

// Used by specs' beforeEach. The page is the shared, already-hydrated worker page
// (see fixtures.ts) — we do NOT navigate here. A page reload re-hydrates the heavy
// production bundle, which is ~60-90s on the slow CI runner; doing that per test
// blows the job timeout. Instead we reset the dashboard to a known state in-place
// (no reload) so the suite pays hydration exactly once.
export async function resetDashboard(page: Page): Promise<void> {
  // Make sure the dashboard is actually up (covers the very first call after login).
  await page.waitForSelector('text=/Connected|Browse Mode/', { timeout: 120_000 });

  // Close any dialog a previous test left open (e.g. the Help modal).
  if ((await page.getByRole('dialog').count()) > 0) {
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  // Return to light theme. Click the toggle while the dark class is present — this
  // converges to light whether a prior test flipped React's theme state (1 click) or
  // just added the class directly (2 clicks).
  const themeToggle = page.getByRole('button', { name: /toggle theme/i });
  for (let i = 0; i < 2; i++) {
    if (!(await page.evaluate(() => document.documentElement.classList.contains('dark')))) break;
    await themeToggle.click();
    await page.waitForTimeout(100);
  }

  // Clear search and return to the default All Apps tab.
  const search = page.getByPlaceholder(/search/i);
  if ((await search.count()) > 0) await search.fill('');
  const allApps = page.getByRole('tab', { name: 'All Apps' });
  if ((await allApps.count()) > 0) await allApps.click();

  await waitForDeployCard(page);
}

// Dashboard header is ready when it reports CLI-connected ("Connected · N apps") or
// "Browse Mode" (no Docker backend); the status appears before the app-card grid, so
// also wait for a card (a Deploy button) before card-dependent specs proceed.
async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForSelector('text=/Connected|Browse Mode/', { timeout: 120_000 });
  await waitForDeployCard(page);
}

async function waitForDeployCard(page: Page): Promise<void> {
  await page.getByRole('button', { name: /deploy/i }).first().waitFor({
    state: 'visible',
    timeout: 60_000,
  });
}
