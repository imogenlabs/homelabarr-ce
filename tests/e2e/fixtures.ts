import { test as base, type Page } from '@playwright/test';
import { login } from './helpers';

// The production bundle is expensive to hydrate on the shared CI runner (~60s cold).
// Playwright's default `page` fixture gives every test a fresh context, so each test
// pays that cost again — 18× serially blows past the job timeout.
//
// Instead, override `page` with a single worker-scoped page: log in and hydrate ONCE,
// then each test re-navigates within the same warm context (cached bundle + JIT'd V8)
// for state isolation, which is fast. With workers=1 that's one cold hydration for the
// whole suite. Specs are unchanged apart from importing test/expect from here.
export const test = base.extend<{ page: Page }, { _authedPage: Page }>({
  _authedPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page); // one cold login + hydrate for the worker
      await use(page);
      await context.close();
    },
    { scope: 'worker' },
  ],

  page: async ({ _authedPage }, use) => {
    await use(_authedPage);
  },
});

export { expect } from '@playwright/test';
