import { defineConfig, devices } from '@playwright/test';

// Test against a running deployment (ce-dev by default), the same approach the suite
// originally used. The app is warm and CDN-fronted, so pages hydrate fast — no local
// build/preview, no per-test cold-start. Override with TEST_BASE_URL.
const BASE_URL = process.env.TEST_BASE_URL || 'https://ce-dev.homelabarr.com';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
