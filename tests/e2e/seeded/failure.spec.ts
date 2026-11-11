import { test, expect } from '@playwright/test';
import { loginAdmin, openDeployedTab, ensureItToolsDeployed } from './_helpers';

// AC1 — a deploy FAILURE surfaces a visible failure state and the failed app is
// NOT added under Deployed Apps.
//
// Mechanism (investigated live against the seeded target): it-tools already
// occupies host port 80, but the streaming CLI deploy path is idempotent — a
// duplicate it-tools deploy *succeeds* server-side (it re-applies the existing
// compose), and the client-side port-conflict validation in DeployModal only
// fires for `number`-typed fields, which catalog apps never produce (their port
// fields are text). So neither a duplicate deploy nor the in-modal validator
// yields a deterministic failure here.
//
// The dialog's own busy-port check must let this deploy through: the only
// holder of it-tools' port is it-tools itself, and deploying a running app again
// updates it in place (HLCE-384). The failure surface is then the server's
// port-conflict reply: `deployApp` rejects and `handleDeploy` shows a "Port
// Conflict" error toast (App.tsx) and never adds the app to Deployed. We force
// that reply via request interception, so the client failure path runs without
// touching the live it-tools container.
test('a port-conflicting deploy shows a failure state and is not added to Deployed', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  await ensureItToolsDeployed(baseURL!); // port 80 is occupied by the running it-tools

  // Intercept ONLY the deploy POST and return the port-conflict the server would
  // surface for an occupied port. Everything else (catalog, containers, auth) is
  // the real backend.
  let deployRequests = 0;
  await page.route('**/api/deploy', async (route) => {
    deployRequests += 1;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Port conflict: port 80 is already in use by another container' }),
    });
  });

  await loginAdmin(page);

  // Count the existing it-tools cards up front so we can prove no new one is added.
  await openDeployedTab(page);
  const itToolsCards = page.getByText(/^\/?it-tools$/i);
  await expect(itToolsCards.first()).toBeVisible({ timeout: 20_000 });
  const before = await itToolsCards.count();
  expect(before, 'it-tools is deployed before the failing deploy').toBeGreaterThanOrEqual(1);

  // Back to a catalog tab so the deploy cards + search are available.
  await page.getByRole('tab', { name: /all apps/i }).click();

  // Drive a deploy of it-tools through the real UI; the intercepted response makes
  // it fail on the occupied port.
  await page.getByPlaceholder(/search/i).first().fill('it-tools');
  const deployCard = page.getByRole('button', { name: /^deploy$/i }).first();
  await expect(deployCard).toBeVisible({ timeout: 10_000 });
  await deployCard.click();

  const modal = page.getByRole('dialog').first();
  await expect(modal.getByRole('heading', { name: /deploy it tools/i })).toBeVisible();
  await modal.getByRole('button', { name: /^deploy/i }).last().click();

  // (a) A visible failure state: the "Port Conflict" error toast. The request
  // went out, so the dialog did not call it-tools' own port busy.
  await expect(page.getByText(/port conflict/i).first()).toBeVisible({ timeout: 15_000 });
  expect(deployRequests).toBe(1);
  await expect(modal.getByText(/port 8089.*already in use/i)).toHaveCount(0);

  // (b) The failed deploy did NOT add another it-tools card under Deployed.
  await openDeployedTab(page);
  await expect(itToolsCards).toHaveCount(before, { timeout: 15_000 });
});
