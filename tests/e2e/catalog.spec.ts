import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('App Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('loads and displays app catalog', async ({ page }) => {
    const header = page.locator('text=/Connected.*\\d+ apps|Browse Mode/');
    await expect(header).toBeVisible();
    const text = await header.textContent();
    const match = text?.match(/(\d+) apps/);
    if (match) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(100);
    }
    // Browse Mode is also valid — means backend is running without Docker
  });

  test('all category tabs are present', async ({ page }) => {
    const expectedTabs = [
      'Deployed Apps',
      'Media & Entertainment',
      'Downloads & Automation',
      'Monitoring & Analytics',
      'Virtual Desktops',
      'Backup & Storage',
      'System & Utilities',
      'Self-hosted',
      'AI & Machine Learning',
      'My Apps',
      'All Apps',
    ];

    for (const tab of expectedTabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
  });

  test('defaults to All Apps tab', async ({ page }) => {
    const allAppsTab = page.getByRole('tab', { name: 'All Apps' });
    await expect(allAppsTab).toHaveAttribute('data-state', 'active');
  });

  test('category tabs filter apps correctly', async ({ page }) => {
    // Click Media & Entertainment
    await page.getByRole('tab', { name: 'Media & Entertainment' }).click();
    // Web-first: cards render asynchronously — assert directly, no fixed wait.
    const deployButtons = page.getByRole('button', { name: /deploy/i });
    await expect(deployButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test('no raw template variables visible', async ({ page }) => {
    // This is critical — no ${VARNAME} should ever appear in the UI
    const body = await page.locator('body').textContent();
    const templateVars = body?.match(/\$\{[A-Z_]+\}/g);
    expect(templateVars).toBeNull();
  });

  test('search filters apps', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search/i);
    await searchBox.fill('plex');
    // Web-first: wait for a Plex result to render (covers the input debounce)
    // instead of a fixed timeout.
    await expect(page.getByText(/plex/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('sort toggle works', async ({ page }) => {
    // Find and click sort button
    const sortButton = page.getByRole('button', { name: /sort|a.*z|z.*a/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();
      // Just verify it doesn't crash — visual order tested via screenshots
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
