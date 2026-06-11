import type { Page } from '@playwright/test';
import { describe, expect, test } from 'vitest';
import { SignInPage } from '../../src/pages/sign-in-page.js';

const stubPage = () => {
  const actions: string[] = [];
  const locator = (description: string) => ({
    fill: (value: string) => {
      actions.push(`fill ${description} with ${value}`);
      return Promise.resolve();
    },
    click: () => {
      actions.push(`click ${description}`);
      return Promise.resolve();
    },
  });
  const page = {
    goto: (url: string) => {
      actions.push(`goto ${url}`);
      return Promise.resolve(null);
    },
    getByRole: (role: string, options?: { name?: string }) => {
      const description = `role=${role}${options?.name === undefined ? '' : ` name=${options.name}`}`;
      actions.push(`locate ${description}`);
      return locator(description);
    },
    getByLabel: (label: string) => locator(`label=${label}`),
    getByTestId: (testId: string) => locator(`testid=${testId}`),
  } as unknown as Page;
  return { page, actions };
};

describe('SignInPage', () => {
  test('lives at the application root', async () => {
    const { page, actions } = stubPage();

    await new SignInPage(page).goto('http://localhost:3000');

    expect(actions).toEqual(['goto http://localhost:3000/']);
  });

  test('exposes the heading and welcome status by role', () => {
    const { page, actions } = stubPage();
    const signInPage = new SignInPage(page);

    void signInPage.heading;
    void signInPage.welcomeStatus;

    expect(actions).toEqual(['locate role=heading name=Sign in', 'locate role=status']);
  });

  test('signIn fills both fields by label and submits via test id', async () => {
    const { page, actions } = stubPage();

    await new SignInPage(page).signIn('nick', 'secret');

    expect(actions).toEqual([
      'fill label=Username with nick',
      'fill label=Password with secret',
      'click testid=login-submit',
    ]);
  });
});
