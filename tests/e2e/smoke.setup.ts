import { test as setup } from '@playwright/test';
import { login, SMOKE_STATE_FILE } from './helpers';

// Authenticate ONCE against the live smoke target and persist the session, so the
// cosmetic smoke specs reuse it instead of each logging in fresh. A live deploy
// rate-limits logins (25 / 15 min / IP, server/ratelimit.js); 18 per-test logins
// plus Playwright retries from a single CI-runner IP used to 429-cascade the suite
// into the 15-minute timeout cap. One login keeps us well under. (HLCE-295.)
setup('authenticate against the smoke target', async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: SMOKE_STATE_FILE });
});
