import { test, expect } from '@playwright/test';
import { loginAdmin } from './_helpers';

// AC4 — the enhanced-mount setup wizard. The wizard (EnhancedMountOnboarding)
// opens when deploying an app whose id includes "mount-enhanced". That app ships
// with the full HomelabARR CLI, not CE's bundled `apps/` catalog, so in a stock
// CE target there is no card to trigger it (the wizard's logic itself is covered
// by the component unit tests, HLCE-225). When the CLI apps ARE mounted
// (CLI_BRIDGE_HOST_PATH), this spec drives the real wizard and asserts its
// prerequisite steps render. Completing a mount needs provider OAuth/credentials
// and is explicitly out of scope (kept manual).
test('enhanced-mount wizard opens and shows its prerequisite steps', async ({ page }) => {
  test.setTimeout(60_000);
  await loginAdmin(page);

  await page.getByPlaceholder(/search/i).first().fill('mount-enhanced');
  await page.waitForLoadState('networkidle');

  const deployBtn = page.getByRole('button', { name: /^deploy$/i }).first();
  const hasMountApp = await deployBtn.isVisible({ timeout: 5000 }).catch(() => false);
  test.skip(!hasMountApp, 'mount-enhanced app not in this catalog (ships with the full CLI, not bundled CE)');

  await deployBtn.click();
  // The deploy modal's submit routes mount-enhanced into the onboarding wizard.
  const modal = page.getByRole('dialog').first();
  await modal.getByRole('button', { name: /^deploy/i }).last().click();

  const wizard = page.getByRole('dialog').filter({ hasText: /Enhanced Cloud Mount Setup|prerequisite/i });
  await expect(wizard).toBeVisible({ timeout: 15_000 });
  // Prerequisite steps render (Traefik / Authelia / Domain checks).
  await expect(wizard.getByText(/Traefik/i)).toBeVisible();
  await expect(wizard.getByText(/Authelia/i)).toBeVisible();

  // Non-destructive: close the wizard.
  await page.getByRole('button', { name: /cancel/i }).first().click().catch(() => page.keyboard.press('Escape'));
});
