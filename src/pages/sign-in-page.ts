import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page.js';

/** Sign-in page of the sample application: the reference page object. */
export class SignInPage extends BasePage {
  constructor(page: Page) {
    super(page, '/');
  }

  get heading(): Locator {
    return this.byRole('heading', { name: 'Sign in' });
  }

  get welcomeStatus(): Locator {
    return this.byRole('status');
  }

  /** Signs in with the given credentials. */
  async signIn(username: string, password: string): Promise<void> {
    await this.byLabel('Username').fill(username);
    await this.byLabel('Password').fill(password);
    await this.byTestId('login-submit').click();
  }
}
