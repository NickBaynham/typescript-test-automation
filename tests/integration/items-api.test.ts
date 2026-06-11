import { expect, test } from 'vitest';
import { z } from 'zod';
import { ApiClient } from '../../src/api.js';
import {
  assertJson,
  assertJsonContains,
  assertMatchesSchema,
  assertStatus,
} from '../../src/assertions.js';
import { loadConfig } from '../../src/config.js';

const client = new ApiClient(loadConfig().api.baseUrl);
const itemSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

test('health reports ok', async () => {
  const response = await client.get('/health');

  assertStatus(response, 200);
  assertJson(response, { status: 'ok' });
});

test('created items can be fetched, listed, and deleted', async () => {
  const created = await client.post('/items', { body: { name: 'integration kettle' } });
  assertStatus(created, 201);
  const item = assertMatchesSchema(created, itemSchema);

  const fetched = await client.get(`/items/${item.id}`);
  assertStatus(fetched, 200);
  assertJsonContains(fetched, { id: item.id, name: 'integration kettle' });

  const listed = await client.get('/items');
  assertStatus(listed, 200);
  const items = assertMatchesSchema(listed, z.array(itemSchema));
  expect(items.map((entry) => entry.id)).toContain(item.id);

  const deleted = await client.delete(`/items/${item.id}`);
  assertStatus(deleted, 204);

  const gone = await client.get(`/items/${item.id}`);
  assertStatus(gone, 404);
});

test('declarative calls dispatch through send', async () => {
  const response = await client.send({ path: '/health' });

  assertStatus(response, 200);
});

test('rejects an item without a usable name', async () => {
  const response = await client.post('/items', { body: { name: '' } });

  assertStatus(response, 422);
  assertJsonContains(response, { detail: 'name must be a non-empty string' });
});

test('unknown item ids return 404 with a diagnostic body', async () => {
  const response = await client.get('/items/does-not-exist');

  assertStatus(response, 404);
  assertJson(response, { detail: 'item not found' });
});
