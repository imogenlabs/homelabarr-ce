import { test, expect } from '@playwright/test';
import { gotoDashboard } from './helpers';

// Login is an inline full-page screen now (LoginScreen), not a modal — the only
// dialog left on the dashboard is the Help modal, opened from the header Help button.
test.describe('Help modal', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDashboard(page);
  });

  test('opens from the header Help button', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Help & Documentation')).toBeVisible();
  });

  test('shows the Quick Start section', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Quick Start/i)).toBeVisible();
  });

  test('credits Imogen Labs', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Imogen Labs/i)).toBeVisible();
  });
});
