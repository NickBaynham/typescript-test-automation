import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { ApiClient } from '../../src/api.js';
import { assertDocumentExists, assertMatchesSchema, assertStatus } from '../../src/assertions.js';
import { loadConfig } from '../../src/config.js';
import { MongoTarget } from '../../src/db.js';
import { ItemsPage } from '../../src/pages/items-page.js';

const config = loadConfig();
const itemSchema = z.object({ id: z.string(), name: z.string() });

// One connection pool per worker, closed when the worker finishes.
const mongo = MongoTarget.fromConfig(config);
test.afterAll(async () => {
  await mongo.close();
});

test('a UI action reaches the API and the database', async ({ page }) => {
  const name = `fullstack-${randomUUID().slice(0, 8)}`;
  const api = new ApiClient(config.api.baseUrl);
  const itemsPage = new ItemsPage(page);

  // UI: a tester-visible action in the browser.
  await itemsPage.goto(config.ui.baseUrl);
  await itemsPage.addItem(name);
  await expect(itemsPage.itemList.getByText(name)).toBeVisible();

  // API: the same item is served by the REST layer.
  const listing = await api.get('/items');
  assertStatus(listing, 200);
  const items = assertMatchesSchema(listing, z.array(itemSchema));
  const match = items.find((item) => item.name === name);
  if (match === undefined) {
    throw new Error(`item ${name} visible in the UI but missing from the API listing`);
  }

  // Database: the document exists with the expected fields.
  const document = await assertDocumentExists(mongo, 'items', { name });
  expect(String(document._id)).toBe(match.id);

  // Cleanup: this test owns the item it created.
  const deleted = await api.delete(`/items/${match.id}`);
  assertStatus(deleted, 204);
});
