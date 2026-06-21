import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Where the `setup` project writes the seeded MFA user's secret + backup code.
// Defined here (a plain, test-free module) so both the setup file and the spec
// can import it without re-registering the setup test.
export const MFA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.seeded-mfa.json');

// The backend serves GET /api/containers?stats=true by running a SYNCHRONOUS
// `docker stats <id> --no-stream` per container on the event loop (server/routes/
// containers.js). On the seeded target the socket-proxy exposes every container
// on the shared host (~17), so one stats sweep blocks the single-threaded backend
// for ~30s, during which it is fully unresponsive (health → 000). The frontend
// polls stats on an interval, which repeatedly wedges the backend mid-test.
//
// This is a real backend bug, tracked as HLCE-275 (the `Promise.all(map(async =>
// execSync))` is fake concurrency — execSync blocks the loop). It's amplified
// here because the seeded target's shared socket exposes the whole host's ~17
// containers, which no real CE deploy does. Until HLCE-275 lands, we neutralize
// it at the harness level WITHOUT touching app code: strip `stats=true` from the
// container-list polling so the backend serves its fast basic-info path instead.
// That path still returns full container objects (State/Status/Names/Ports) —
// everything the specs assert on — only the CPU/mem gauges read 0 (unchecked).
// Remove this accommodation when HLCE-275 is fixed.
export async function relaxStatsPolling(page: Page): Promise<void> {
  await page.route('**/api/containers?*stats=true*', async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.delete('stats');
    await route.continue({ url: url.toString() });
  });
}

// Fill the inline Sign In form and submit. Retries the fill until the values
// stick (survives any hydration race), mirroring the live-suite helper.
export async function fillLogin(page: Page, username: string, password: string): Promise<void> {
  await relaxStatsPolling(page);
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

// The seeded non-admin user (role `user`, no MFA). Created idempotently by the
// `setup` project and used by the permissions spec to prove the admin-only UI
// is hidden for non-admins.
export const VIEWER_USER = {
  username: 'viewer',
  email: 'viewer@e2e.local',
  password: 'viewerpass123',
} as const;

// Open the top-right UserMenu dropdown. The trigger is the header button that
// shows the logged-in username; it's identified robustly as the header button
// that, once clicked, reveals the "Sign Out" menuitem.
export async function openUserMenu(page: Page): Promise<void> {
  const signOut = page.getByRole('menuitem', { name: /sign out/i });
  // Already open? nothing to do.
  if (await signOut.isVisible().catch(() => false)) return;
  const trigger = page.locator('header button').filter({ hasText: /admin|user|viewer/i }).last();
  await expect(async () => {
    await trigger.click();
    await expect(signOut).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 10_000 });
}

// Open UserMenu → Settings (the UserSettings modal).
export async function openSettings(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /settings/i }).click();
  await expect(page.getByRole('heading', { name: /user settings/i })).toBeVisible({ timeout: 10_000 });
}

// Close the UserSettings modal (a plain overlay, not a Radix dialog — Escape is
// not wired, so it's closed via the header X button).
export async function closeSettings(page: Page): Promise<void> {
  const heading = page.getByRole('heading', { name: /user settings/i });
  if (!(await heading.isVisible().catch(() => false))) return;
  await heading.locator('xpath=following-sibling::button[1]').click();
  await expect(heading).toBeHidden({ timeout: 10_000 });
}

// Open UserMenu → API Keys (the ApiKeysModal).
export async function openApiKeys(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /api keys/i }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /^api keys$/i }))
    .toBeVisible({ timeout: 10_000 });
}

// Open UserMenu → Sign Out and return to the login wall.
export async function logout(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await expect(page.locator('#login-username')).toBeVisible({ timeout: 15_000 });
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
