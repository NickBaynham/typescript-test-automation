import type { Locator, Page } from '@playwright/test';
import { describe, expect, test } from 'vitest';
import { BasePage } from '../../src/pages/base-page.js';

interface StubCall {
  method: string;
  args: unknown[];
}

const stubPage = () => {
  const calls: StubCall[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return { stubbedBy: method } as unknown as Locator;
    };
  const page = {
    goto: (url: string) => {
      calls.push({ method: 'goto', args: [url] });
      return Promise.resolve(null);
    },
    getByRole: record('getByRole'),
    getByTestId: record('getByTestId'),
    getByLabel: record('getByLabel'),
  } as unknown as Page;
  return { page, calls };
};

class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page, '/login');
  }

  get heading(): Locator {
    return this.byRole('heading', { name: 'Sign in' });
  }

  get submitButton(): Locator {
    return this.byTestId('login-submit');
  }

  get passwordField(): Locator {
    return this.byLabel('Password');
  }
}

describe('BasePage', () => {
  test('goto composes the page path against the base URL', async () => {
    const { page, calls } = stubPage();

    await new LoginPage(page).goto('http://localhost:3000');

    expect(calls).toEqual([{ method: 'goto', args: ['http://localhost:3000/login'] }]);
  });

  test.each([
    ['base with trailing slash', 'http://localhost:3000/', 'http://localhost:3000/login'],
    ['https remote host', 'https://app.example.com', 'https://app.example.com/login'],
  ])('goto handles %s', async (_case, baseUrl, expected) => {
    const { page, calls } = stubPage();

    await new LoginPage(page).goto(baseUrl);

    expect(calls[0]?.args).toEqual([expected]);
  });

  test('byRole delegates to getByRole with role and accessible name', () => {
    const { page, calls } = stubPage();

    const locator = new LoginPage(page).heading;

    expect(locator).toEqual({ stubbedBy: 'getByRole' });
    expect(calls).toEqual([{ method: 'getByRole', args: ['heading', { name: 'Sign in' }] }]);
  });

  test('byLabel delegates to getByLabel for form fields without a role', () => {
    const { page, calls } = stubPage();

    const locator = new LoginPage(page).passwordField;

    expect(locator).toEqual({ stubbedBy: 'getByLabel' });
    expect(calls).toEqual([{ method: 'getByLabel', args: ['Password'] }]);
  });

  test('byTestId delegates to getByTestId', () => {
    const { page, calls } = stubPage();

    const locator = new LoginPage(page).submitButton;

    expect(locator).toEqual({ stubbedBy: 'getByTestId' });
    expect(calls).toEqual([{ method: 'getByTestId', args: ['login-submit'] }]);
  });
});
