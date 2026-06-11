import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page.js';

/** Items section of the sample application, used by the full-stack scenario. */
export class ItemsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/');
  }

  get itemList(): Locator {
    return this.byRole('list', { name: 'Items' });
  }

  /** Adds an item through the UI form. */
  async addItem(name: string): Promise<void> {
    await this.byLabel('New item').fill(name);
    await this.byRole('button', { name: 'Add' }).click();
  }
}
