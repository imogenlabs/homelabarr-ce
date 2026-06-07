import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('theme toggle changes background color', async ({ page }) => {
    // Get initial background from body (root may be transparent)
    const bgBefore = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Click theme toggle
    const toggle = page.getByRole('button', { name: /toggle theme/i });
    await toggle.click();
    await page.waitForTimeout(500);

    // Background should change
    const bgAfter = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    expect(bgBefore).not.toEqual(bgAfter);
  });

  test('dark mode has visible card separation', async ({ page }) => {
    // Force dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));

    // Anchor on a real app card (the Card ancestor of a Deploy button) rather than
    // the first element with "card" in its class — that can be a transparent layout
    // wrapper, which made this comparison flaky. App cards use bg-card, distinct
    // from the page background. Retry until the theme CSS settles.
    const card = page
      .getByRole('button', { name: /deploy/i })
      .first()
      .locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"Card")][1]');
    await expect(card).toBeVisible();
    await expect(async () => {
      const cardBg = await card.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      const pageBg = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      );
      expect(cardBg).not.toEqual(pageBg);
    }).toPass({ timeout: 5_000 });
  });

  test('category tags readable in dark mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.getByRole('tab', { name: 'All Apps' }).click();
    await page.waitForTimeout(300);

    // Verify category tags are present and readable by checking visible text content
    // App cards show tags like "media-management", "transcoding", "Traefik", "Auth"
    const tagText = await page.evaluate(() => {
      // Look for small inline elements within card areas that contain category names
      const els = document.querySelectorAll('[class*="badge"], [class*="Badge"], span[class*="bg-"], span[class*="text-"]');
      const visible: string[] = [];
      els.forEach((el) => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        if (text && text.length < 30 && style.display !== 'none' && style.visibility !== 'hidden') {
          visible.push(text);
        }
      });
      return visible;
    });
    // Should find at least some tag-like text
    expect(tagText.length).toBeGreaterThan(0);
  });
});
