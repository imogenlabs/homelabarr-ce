import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

interface ImageResponse {
  url: string;
  status: number | string;
  contentType: string;
  redirectedFrom: string[];
}

// Record every image request the page makes, so a failed icon check can say what
// the browser actually got back (status, content type, redirects) instead of a bare
// "false". HLCE-356: the 30 Sep failure left nothing to read.
function recordImageResponses(page: Page): ImageResponse[] {
  const seen: ImageResponse[] = [];
  page.on('response', (res) => {
    const req = res.request();
    if (req.resourceType() !== 'image') return;
    const redirectedFrom: string[] = [];
    for (let r = req.redirectedFrom(); r; r = r.redirectedFrom()) redirectedFrom.unshift(r.url());
    seen.push({ url: res.url(), status: res.status(), contentType: res.headers()['content-type'] ?? '', redirectedFrom });
  });
  page.on('requestfailed', (req) => {
    if (req.resourceType() !== 'image') return;
    seen.push({ url: req.url(), status: `failed: ${req.failure()?.errorText ?? 'unknown'}`, contentType: '', redirectedFrom: [] });
  });
  return seen;
}

test.describe('App Icons', () => {
  let responses: ImageResponse[] = [];

  test.beforeEach(async ({ page }) => {
    // Before login: the first load of each icon happens on whichever tab opens first,
    // and later tabs reuse it from the memory cache without a new response.
    responses = recordImageResponses(page);
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
      // Match the card's own icon by its exact alt text. A page-wide `text=Plex`
      // matches any element that merely mentions Plex, and the old guards skipped
      // the check entirely when nothing matched.
      const img = page.locator(`img[alt="${app} icon"]`).first();
      await expect(img, `${app} should have a card with an icon on this tab`).toBeAttached();

      // An image still in flight is not a broken one: wait for the browser to settle.
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete), {
          message: `${app} icon never finished loading`,
          timeout: 10_000,
        })
        .toBe(true);

      const state = await img.evaluate((el: HTMLImageElement) => ({
        src: el.currentSrc || el.src,
        naturalWidth: el.naturalWidth,
        hiddenAsFallback: el.style.display === 'none',
      }));
      const related = responses.filter((r) => r.url.toLowerCase().includes(app.toLowerCase()));
      const evidence = JSON.stringify({ ...state, responses: related.length ? related : 'none seen (served from cache)' });
      expect(state.naturalWidth, `Icon for ${app} should load: ${evidence}`).toBeGreaterThan(0);
    }
  });
});
