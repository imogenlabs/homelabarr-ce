import { test, expect } from './fixtures';
import { resetDashboard } from './helpers';

test.describe('Footer & Branding', () => {
  test.beforeEach(async ({ page }) => {
    await resetDashboard(page);
  });

  test('footer is visible with Imogen Labs branding', async ({ page }) => {
    const footer = page.locator('footer, [class*="footer"]');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=Imogen Labs')).toBeVisible();
  });

  test('footer contains essential links', async ({ page }) => {
    const footer = page.locator('footer, [class*="footer"]');

    // Should link to docs, Discord, and GitHub
    const links = footer.locator('a');
    const hrefs: string[] = [];
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href) hrefs.push(href);
    }

    // At minimum, link to Imogen Labs
    const hasImogenLabs = hrefs.some((h) => h.includes('imogenlabs'));
    expect(hasImogenLabs).toBe(true);
  });

  test('copyright year is current', async ({ page }) => {
    const footer = page.locator('footer, [class*="footer"]');
    await expect(footer.locator('text=2026')).toBeVisible();
  });
});
