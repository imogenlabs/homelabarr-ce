import { test as setup } from '@playwright/test';
import { login } from './helpers';

const AUTH_STATE = 'tests/e2e/.auth/state.json';

// Log in once and persist the session cookie. Every spec reuses this storage state
// and lands on the dashboard without touching the login form — which avoids paying
// the React hydration race (fill-before-handlers-attached) on every test. That race
// is the main flake source on the slow CI runner.
setup('authenticate', async ({ page }) => {
  setup.setTimeout(300_000);
  await login(page);
  await page.context().storageState({ path: AUTH_STATE });
});
