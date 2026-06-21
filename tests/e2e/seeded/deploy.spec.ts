import { test, expect } from '@playwright/test';
import { loginAdmin, openDeployedTab, itToolsCard } from './_helpers';

// AC3 — deploy an app end-to-end through the (streaming) deploy path until it
// appears in Deployed. it-tools is the lightweight, deterministic catalog app;
// the backend deploys it via the streaming CLI bridge (source: cli-streaming),
// which the UI surfaces as a "Deploying … via HomelabARR CLI" progress toast.
test('deploys it-tools and it shows up under Deployed Apps', async ({ page }) => {
  test.setTimeout(90_000);
  await loginAdmin(page);

  await page.getByPlaceholder(/search/i).first().fill('it-tools');
  const deployCard = page.getByRole('button', { name: /^deploy$/i }).first();
  await expect(deployCard).toBeVisible({ timeout: 10_000 });
  await deployCard.click();

  const modal = page.getByRole('dialog').first();
  await expect(modal.getByRole('heading', { name: /deploy it tools/i })).toBeVisible();
  await modal.getByRole('button', { name: /^deploy/i }).last().click();

  // Deployment kicked off through the streaming CLI path.
  await expect(page.getByText(/Deploying self-hosted-it-tools via HomelabARR CLI/i))
    .toBeVisible({ timeout: 15_000 });

  // …and it lands in Deployed Apps (the container is polled in).
  await openDeployedTab(page);
  await expect(page.getByText(/^\/?it-tools$/i).first()).toBeVisible({ timeout: 40_000 });

  // It is actually RUNNING, not merely present: the Stop control is only rendered
  // for a running container (a stopped one would offer Start instead).
  await expect(itToolsCard(page).getByTitle('Stop')).toBeVisible({ timeout: 40_000 });
});
