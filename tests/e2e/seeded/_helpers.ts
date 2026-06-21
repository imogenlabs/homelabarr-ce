import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Where the `setup` project writes the seeded MFA user's secret + backup code.
// Defined here (a plain, test-free module) so both the setup file and the spec
// can import it without re-registering the setup test.
export const MFA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.seeded-mfa.json');

// Fill the inline Sign In form and submit. Retries the fill until the values
// stick (survives any hydration race), mirroring the live-suite helper.
export async function fillLogin(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/');
  const u = page.locator('#login-username');
  const p = page.locator('#login-password');
  await expect(u).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    await u.fill(username);
    await p.fill(password);
    await expect(u).toHaveValue(username);
    await expect(p).toHaveValue(password);
  }).toPass({ timeout: 10_000 });
  await page.getByRole('button', { name: /sign in/i }).click();
}

// The authenticated app is up once the header connection status renders.
export async function expectLandedOnApp(page: Page): Promise<void> {
  await expect(page.getByText(/Connected|Browse Mode/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#login-username')).toHaveCount(0);
}

// Log in as the seeded admin (no MFA) and land on the app.
export async function loginAdmin(page: Page): Promise<void> {
  await fillLogin(page, 'admin', 'admin');
  await expectLandedOnApp(page);
}

export const IT_TOOLS_APP_ID = 'self-hosted-it-tools';

// Open the "Deployed Apps" tab.
export async function openDeployedTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /deployed apps/i }).click();
}

// The deployed-container card for it-tools, scoped tightly so lifecycle actions
// (stop/restart/remove) can NEVER hit another container's card. The card is the
// nearest ancestor of the exact "it-tools" title that also contains a Remove
// button. Asserted to resolve to exactly one element by callers before acting.
export function itToolsCard(page: Page) {
  return page
    .getByText(/^\/?it-tools$/i)
    .first()
    .locator('xpath=ancestor::*[.//button[@title="Remove"]][1]');
}

// Ensure it-tools is deployed via the API (idempotent) and wait until the
// container is running, so container-lifecycle specs have a target regardless of
// run order. Uses a throwaway admin API context.
export async function ensureItToolsDeployed(baseURL: string): Promise<void> {
  const { request: apiRequest } = await import('@playwright/test');
  const ctx = await apiRequest.newContext({ baseURL });
  try {
    await ctx.post('/api/auth/login', { data: { username: 'admin', password: 'admin' } });
    const csrf = (await ctx.storageState()).cookies.find((c) => c.name === 'hl_csrf')?.value ?? '';
    const headers = { 'x-csrf-token': csrf, 'x-requested-with': 'XMLHttpRequest' };
    await ctx.post('/api/deploy', {
      data: { appId: IT_TOOLS_APP_ID, config: {}, mode: { type: 'standard' } },
      headers,
    });
    // Poll /api/containers until it-tools shows up.
    await expect(async () => {
      const res = await ctx.get('/api/containers', { headers });
      const body = await res.json();
      const names = (body.containers ?? []).flatMap((c: { Names?: string[] }) => c.Names ?? []);
      expect(names.some((n: string) => n.includes('it-tools'))).toBeTruthy();
    }).toPass({ timeout: 40_000, intervals: [2000] });
  } finally {
    await ctx.dispose();
  }
}
