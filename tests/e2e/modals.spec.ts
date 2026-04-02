import { test, expect } from '@playwright/test';

test.describe('Modals & Dialogs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Connected');
  });

  test('login modal opens centered', async ({ page }) => {
    const signIn = page.getByRole('button', { name: /sign in/i });
    await signIn.click();
    await page.waitForTimeout(300);

    // Dialog should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Check it's roughly centered (not pushed to bottom)
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize()!;

    if (box) {
      const dialogCenterY = box.y + box.height / 2;
      const viewportCenterY = viewport.height / 2;
      // Should be within 30% of center
      const tolerance = viewport.height * 0.3;
      expect(Math.abs(dialogCenterY - viewportCenterY)).toBeLessThan(tolerance);
    }
  });

  test('login modal opens centered in dark mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(200);

    const signIn = page.getByRole('button', { name: /sign in/i });
    await signIn.click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    const viewport = page.viewportSize()!;

    if (box) {
      const dialogCenterY = box.y + box.height / 2;
      const viewportCenterY = viewport.height / 2;
      const tolerance = viewport.height * 0.3;
      expect(Math.abs(dialogCenterY - viewportCenterY)).toBeLessThan(tolerance);
    }
  });

  test('help modal opens with content', async ({ page }) => {
    const help = page.getByRole('button', { name: /help/i });
    await help.click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should contain key sections
    await expect(dialog.locator('text=/Quick Start|Getting Started/i')).toBeVisible();

  });

  test('help modal contains Imogen Labs credit', async ({ page }) => {
    const help = page.getByRole('button', { name: /help/i });
    await help.click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('text=Imogen Labs')).toBeVisible();
  });
});
