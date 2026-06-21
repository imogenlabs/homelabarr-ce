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

  // Search by the display name ("Mount Enhanced") — the catalog search matches the
  // app's displayName, not the hyphenated backend id (`mount-enhanced`).
  await page.getByPlaceholder(/search/i).first().fill('Mount Enhanced');
  await page.waitForLoadState('networkidle');

  const deployBtn = page.getByRole('button', { name: /^deploy$/i }).first();
  await expect(deployBtn, 'seeded mount-enhanced stub renders a deploy card').toBeVisible({ timeout: 10_000 });

  await deployBtn.click();
  // The deploy modal's submit routes mount-enhanced into the onboarding wizard.
  const modal = page.getByRole('dialog').first();
  await modal.getByRole('button', { name: /^deploy/i }).last().click();

  // The onboarding wizard renders as a full-screen overlay (NOT a Radix dialog
  // role), so assert its heading + prerequisite content directly.
  await expect(page.getByRole('heading', { name: /Enhanced Cloud Mount Setup/i }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Prerequisites check/i)).toBeVisible();
  // Prerequisite steps render (Traefik + Authelia infrastructure requirements).
  await expect(page.getByText(/Traefik/i).first()).toBeVisible();
  await expect(page.getByText(/Authelia/i).first()).toBeVisible();

  // Non-destructive: close the wizard (Cancel/Close button, else Escape).
  const close = page.getByRole('button', { name: /cancel|close|back to apps/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press('Escape');
});
