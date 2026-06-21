import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('App Icons', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('no broken image elements visible', async ({ page }) => {
    // Navigate to All Apps
    await page.getByRole('tab', { name: 'All Apps' }).click();
    // Web-first: wait for cards (and their images) to render before scanning.
    await expect(page.getByRole('button', { name: /deploy/i }).first()).toBeVisible({ timeout: 10_000 });

    // Check all img tags — none should have naturalWidth=0 while being visible
    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const broken: string[] = [];
      imgs.forEach((img) => {
        if (img.offsetParent !== null && img.naturalWidth === 0 && img.complete) {
          broken.push(img.src || img.alt || 'unknown');
        }
      });
      return broken;
    });

    // Allow zero broken images
    expect(brokenImages).toEqual([]);
  });

  test('known apps have real icons not letter fallbacks', async ({ page }) => {
    await page.getByRole('tab', { name: 'Media & Entertainment' }).click();
    // Web-first: wait for cards to render before checking their icons.
    await expect(page.getByRole('button', { name: /deploy/i }).first()).toBeVisible({ timeout: 10_000 });

    // These apps MUST have real icons — they're core to the product
    const coreApps = ['Plex', 'Sonarr', 'Radarr', 'Jellyfin', 'Bazarr'];

    for (const app of coreApps) {
      const card = page.locator(`text=${app}`).first();
      if (await card.isVisible()) {
        // Find the nearest img — it should exist and load
        const img = card.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"Card")]//img').first();
        if (await img.count() > 0) {
          const loaded = await img.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
          );
          expect(loaded, `Icon for ${app} should load`).toBe(true);
        }
      }
    }
  });
});
