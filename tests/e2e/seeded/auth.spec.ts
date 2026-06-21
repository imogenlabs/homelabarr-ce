import { test, expect } from '@playwright/test';
import { TOTP, Secret } from 'otpauth';
import fs from 'node:fs';
import { fillLogin, expectLandedOnApp, loginAdmin, MFA_FILE } from './_helpers';

// AC2 — login + MFA asserted as a feature against the seeded target.
// The MFA user is seeded by the `setup` project; we read its TOTP secret here
// and generate live codes (same otpauth lib the backend uses).
type SeededMfa = { username: string; password: string; secret: string; backupCode: string };
function seededMfa(): SeededMfa {
  return JSON.parse(fs.readFileSync(MFA_FILE, 'utf8'));
}
function totpFor(secret: string): string {
  return new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30, algorithm: 'SHA1' }).generate();
}

test('admin logs in with username + password and lands on the app', async ({ page }) => {
  await loginAdmin(page);
});

test('MFA user is prompted for a code and a valid TOTP lands on the app', async ({ page }) => {
  const { username, password, secret } = seededMfa();
  await fillLogin(page, username, password);

  const code = page.locator('#mfa-code');
  await expect(code, 'MFA step is shown after password').toBeVisible({ timeout: 15_000 });

  await code.fill(totpFor(secret));
  await page.getByRole('button', { name: /verify/i }).click();

  await expectLandedOnApp(page);
});

test('a wrong MFA code is rejected and does not log the user in', async ({ page }) => {
  const { username, password } = seededMfa();
  await fillLogin(page, username, password);

  const code = page.locator('#mfa-code');
  await expect(code).toBeVisible({ timeout: 15_000 });
  await code.fill('000000');
  await page.getByRole('button', { name: /verify/i }).click();

  // Still on the MFA step — not authenticated.
  await expect(code).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Connected|Browse Mode/)).toHaveCount(0);
});

test('a backup code satisfies the MFA challenge', async ({ page }) => {
  const { username, password, backupCode } = seededMfa();
  await fillLogin(page, username, password);

  await expect(page.locator('#mfa-code')).toBeVisible({ timeout: 15_000 });
  // Switch from authenticator code to backup code entry.
  await page.getByRole('button', { name: /use a backup code/i }).click();
  await page.locator('#mfa-code').fill(backupCode);
  await page.getByRole('button', { name: /verify/i }).click();

  await expectLandedOnApp(page);
});
