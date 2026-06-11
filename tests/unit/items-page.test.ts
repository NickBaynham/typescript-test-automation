import type { Page } from '@playwright/test';
import { describe, expect, test } from 'vitest';
import { ItemsPage } from '../../src/pages/items-page.js';

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

describe('ItemsPage', () => {
  test('lives at the application root', async () => {
    const { page, actions } = stubPage();

    await new ItemsPage(page).goto('http://localhost:3100');

    expect(actions).toEqual(['goto http://localhost:3100/']);
  });

  test('addItem fills the field by label and submits via the Add button', async () => {
    const { page, actions } = stubPage();

    await new ItemsPage(page).addItem('kettle');

    expect(actions).toEqual([
      'fill label=New item with kettle',
      'locate role=button name=Add',
      'click role=button name=Add',
    ]);
  });

  test('exposes the item list by its accessible name', () => {
    const { page, actions } = stubPage();

    void new ItemsPage(page).itemList;

    expect(actions).toEqual(['locate role=list name=Items']);
  });
});
