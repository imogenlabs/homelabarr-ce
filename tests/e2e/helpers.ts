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

// Used by specs' beforeEach. The shared storage state (see auth.setup.ts) already
// carries the session cookie, so navigating home lands on the dashboard once the SPA
// resolves /auth/me — no form interaction, so no hydration-fill race per test. Only
// if the login wall is genuinely up (no/expired session) do we authenticate.
export async function gotoDashboard(page: Page): Promise<void> {
  await page.goto('/');

  // Actually WAIT for the dashboard status (waitFor blocks; isVisible() does not).
  // With a restored session the app shows it after resolving /auth/me. Touch no
  // inputs on this path, so there's no hydration-fill race.
  const status = page.locator('text=/Connected|Browse Mode/').first();
  try {
    await status.waitFor({ state: 'visible', timeout: 120_000 });
  } catch {
    // Fallback: session didn't restore — log in the slow way.
    await login(page);
    return;
  }
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
