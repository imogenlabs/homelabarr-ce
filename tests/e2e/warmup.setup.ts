import { test as warmup } from '@playwright/test';
import { login } from './helpers';

// Runs once before the parallel specs (they depend on the 'warmup' project).
// Exercises the full login + dashboard path so the shared Vite preview server has
// transformed/served every chunk and the backend is warm — otherwise the first
// real specs race a cold first render and flake on the dashboard-ready wait.
warmup('warm up the stack', async ({ page }) => {
  // Extra headroom: this run pays the full cold-start cost (bundle download + parse
  // + hydrate on a shared runner) so the actual specs don't.
  warmup.setTimeout(300_000);
  await login(page);
});
