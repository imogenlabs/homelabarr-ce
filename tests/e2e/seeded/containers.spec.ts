import { test, expect } from '@playwright/test';
import { loginAdmin, openDeployedTab, itToolsCard, ensureItToolsDeployed } from './_helpers';

// AC4 — container lifecycle (stop/start/restart/remove) + log view, exercised on
// the it-tools container. Every action is scoped to the it-tools CARD (the
// nearest ancestor of the exact "it-tools" title that holds a Remove button), so
// it can never affect another container the socket-proxy exposes. Runs serially.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ baseURL }) => {
  await ensureItToolsDeployed(baseURL!);
});

test.beforeEach(async ({ page }) => {
  await loginAdmin(page);
  await openDeployedTab(page);
  // Guard: there must be exactly one it-tools card before we touch anything.
  await expect(page.getByText(/^\/?it-tools$/i)).toHaveCount(1, { timeout: 20_000 });
});

test('stop then start the it-tools container', async ({ page }) => {
  const card = itToolsCard(page);
  await card.getByTitle('Stop').click();
  // Once stopped, the card offers Start instead of Stop.
  await expect(card.getByTitle('Start')).toBeVisible({ timeout: 25_000 });

  await card.getByTitle('Start').click();
  await expect(card.getByTitle('Stop')).toBeVisible({ timeout: 25_000 });
});

test('restart the it-tools container', async ({ page }) => {
  const card = itToolsCard(page);
  await card.getByTitle('Restart').click();
  // Still present + running (Stop available) after the restart settles.
  await expect(card.getByTitle('Stop')).toBeVisible({ timeout: 25_000 });
});

test('view the it-tools container logs', async ({ page }) => {
  const card = itToolsCard(page);
  await card.getByTitle('More actions').click();
  await page.getByRole('menuitem', { name: /view logs/i }).click();

  const logs = page.getByRole('dialog').filter({ hasText: /logs/i });
  await expect(logs).toBeVisible({ timeout: 15_000 });
  await expect(logs.getByText(/auto-refresh/i)).toBeVisible();

  // Assert REAL log content, not just the viewer chrome. it-tools runs the
  // corentinth/it-tools nginx image, whose entrypoint emits deterministic startup
  // lines ("/docker-entrypoint.sh: …", "Configuration complete; ready for start
  // up"). Match any of those so the assertion is robust to log ordering/volume.
  await expect(
    logs.getByText(/docker-entrypoint|nginx|Configuration complete|listen/i).first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.keyboard.press('Escape');
});

test('remove the it-tools container', async ({ page }) => {
  const card = itToolsCard(page);
  // Hard guard: confirm the scoped card is really it-tools before destroying it.
  await expect(card.getByText(/^\/?it-tools$/i)).toBeVisible();
  await card.getByTitle('Remove').click();

  // This card's Remove (ContainerControls) removes immediately — there is no
  // separate confirm dialog. Positively assert the confirming signal: the
  // "Container removed successfully" toast, then the card is gone.
  await expect(page.getByText(/removed successfully/i).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText(/^\/?it-tools$/i)).toHaveCount(0, { timeout: 25_000 });
});
