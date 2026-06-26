import { defineConfig, devices } from '@playwright/test';
import { SMOKE_STATE_FILE } from './tests/e2e/helpers';

// Two lanes (HLCE-226):
//   • `seeded` — the deterministic containerised target from docker-compose.e2e.yml
//     (fresh admin, real allow-listed Docker socket). Drives the critical user
//     journeys: login + MFA, deploy-through-progress-stream, container lifecycle,
//     mount wizard. Override its URL with E2E_BASE_URL (default localhost:8099).
//   • `smoke` — the cosmetic catalog/theme/footer checks against a LIVE deploy
//     (ce-dev by default). Override with TEST_BASE_URL.
//
// The `setup` project runs first (a `seeded` dependency) and seeds an
// MFA-enabled user via the API so the MFA login journey is deterministic.
const SEEDED_URL = process.env.E2E_BASE_URL || 'http://localhost:8099';
const SMOKE_URL = process.env.TEST_BASE_URL || 'https://ce-dev.homelabarr.com';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Seeds the MFA-enabled user against the seeded target; writes its TOTP
    // secret + a backup code to tests/e2e/.seeded-mfa.json for the auth spec.
    {
      name: 'setup',
      testMatch: /seeded\/mfa\.setup\.ts$/,
      use: { baseURL: SEEDED_URL },
    },
    {
      name: 'seeded',
      testMatch: /seeded\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: SEEDED_URL },
      dependencies: ['setup'],
    },
    // Logs in once against the live smoke target and saves storageState, so the
    // smoke specs reuse one session instead of one login per test (HLCE-295).
    {
      name: 'smoke-setup',
      testMatch: /smoke\.setup\.ts$/,
      use: { baseURL: SMOKE_URL },
    },
    {
      name: 'smoke',
      testMatch: /(catalog|dark-mode|footer|icons|modals)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: SMOKE_URL, storageState: SMOKE_STATE_FILE },
      dependencies: ['smoke-setup'],
    },
  ],
});
