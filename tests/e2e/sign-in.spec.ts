import { expect, test } from '@playwright/test';
import { loadConfig } from '../../src/config.js';
import { SignInPage } from '../../src/pages/sign-in-page.js';

const { ui } = loadConfig();

test('shows the sign-in form', async ({ page }) => {
  const signInPage = new SignInPage(page);

  await signInPage.goto(ui.baseUrl);

  await expect(signInPage.heading).toBeVisible();
});

test('signing in greets the user by name', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto(ui.baseUrl);

  await signInPage.signIn('nick', 'secret');

  await expect(signInPage.welcomeStatus).toHaveText('Welcome, nick');
});

test('submitting without credentials stays on the form', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto(ui.baseUrl);

  await signInPage.signIn('', '');

  await expect(signInPage.heading).toBeVisible();
});
