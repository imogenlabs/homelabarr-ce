import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// E2E runs against the real product, started locally by Playwright (see webServer
// below): the Node API in browse mode + the Vite dev server proxying /api to it.
// This tests the actual inline-login UI end users get — not the public demo, which
// trips the login rate-limiter and is being retired. Point at a deployed instance
// instead by setting TEST_BASE_URL (the webServer is then skipped).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTE_URL = process.env.TEST_BASE_URL;
const LOCAL_URL = 'http://localhost:8080';
const BACKEND_PORT = 30002;

// Fresh, gitignored data dir so the backend seeds its default admin/admin on boot.
const DATA_DIR = path.join(__dirname, '.e2e-data');
if (!REMOTE_URL) fs.mkdirSync(DATA_DIR, { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker on purpose: the backend's /containers route shells out to
  // `docker ps` via a synchronous execSync, which blocks the Node event loop and
  // starves concurrent requests (the dashboard status then never renders and login
  // times out). Serialized, the suite is both reliable and fast (~16s).
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  // The shared CI runner is slow to hydrate the production bundle on first load
  // (~60s observed); the warmup project absorbs that (with its own longer per-test
  // timeout) and the rest run warm. This ceiling just needs to clear the login +
  // dashboard waits comfortably.
  timeout: 180_000,

  use: {
    baseURL: REMOTE_URL || LOCAL_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // Logs in once and saves the session, so specs reuse it and skip the
      // per-test login (and its hydration race). Also warms the stack.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/state.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Only spin up the local stack when not targeting a deployed instance.
  webServer: REMOTE_URL ? undefined : [
    {
      command: 'node server/index.js',
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'development',
        PORT: String(BACKEND_PORT),
        DATA_DIR,
        DB_PATH: path.join(DATA_DIR, 'homelabarr.db'),
        JWT_SECRET: 'e2e-local-test-secret-key-32chars-min-1234567890',
        // The suite drives many requests from one IP; the per-IP limiter would
        // otherwise 429 and flake login. Gated off only here.
        RATE_LIMIT_DISABLED: 'true',
        // Skip the synchronous `docker ps` in /containers — it blocks the event
        // loop and hangs the dashboard when the runner's Docker is absent/stalled.
        // The UI suite doesn't test container management.
        E2E_DISABLE_DOCKER: 'true',
      },
    },
    {
      // Serve the production build via `vite preview` so the frontend uses its
      // relative '/api' base (same-origin), exactly as it does behind nginx in
      // production. The dev server hardcodes a different backend URL, which
      // breaks cookie auth — preview avoids that.
      command: 'npx vite build && npx vite preview --port 8080 --strictPort',
      url: LOCAL_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
