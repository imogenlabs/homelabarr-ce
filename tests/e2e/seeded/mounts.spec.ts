import { test, expect } from '@playwright/test';
import { loginAdmin } from './_helpers';

// AC4 — the enhanced-mount setup wizard. The wizard (EnhancedMountOnboarding)
// opens when deploying an app whose id includes "mount-enhanced". Stock CE doesn't
// bundle that app (it ships with the full HomelabARR CLI), so the seeded E2E
// target volume-mounts a seeded-only stub (tests/e2e/fixtures/mount-enhanced.yml,
// wired in docker-compose.e2e.yml) into the catalog dir the cli-bridge scans —
// so the wizard journey runs in CI here without polluting the real CE catalog.
// Completing a mount needs provider OAuth/credentials and is out of scope (manual).
test('enhanced-mount wizard opens and shows its prerequisite steps', async ({ page }) => {
  test.setTimeout(60_000);
  await loginAdmin(page);

  await page.getByPlaceholder(/search/i).first().fill('mount-enhanced');
  await page.waitForLoadState('networkidle');

  const deployBtn = page.getByRole('button', { name: /^deploy$/i }).first();
  await expect(deployBtn, 'seeded mount-enhanced stub renders a deploy card').toBeVisible({ timeout: 10_000 });

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
