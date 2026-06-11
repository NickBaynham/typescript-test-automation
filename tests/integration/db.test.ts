import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import {
  assertCollectionCount,
  assertDocumentAbsent,
  assertDocumentExists,
  assertFieldValues,
  DbAssertionError,
} from '../../src/assertions.js';
import { loadConfig } from '../../src/config.js';
import { MongoSeeder, MongoTarget } from '../../src/db.js';
import { redactUrl } from '../../src/urls.js';

// A collection of our own so these tests never touch application data.
const collection = 'platform_integration';

const target = MongoTarget.fromConfig(loadConfig());
const seeder = new MongoSeeder(target);

beforeAll(async () => {
  if (!(await target.ping())) {
    throw new Error(
      `MongoDB not reachable at ${redactUrl(loadConfig().mongo.url)}; ` +
        'start the stack with make docker-up',
    );
  }
});

afterEach(async () => {
  await seeder.cleanup();
});

afterAll(async () => {
  await target.close();
});

test('seeder inserts documents and cleanup removes exactly those', async () => {
  const marker = randomUUID();

  await seeder.seed(collection, { marker, n: 1 }, { marker, n: 2 });
  await assertCollectionCount(target, collection, 2, { marker });

  await seeder.cleanup();
  await assertCollectionCount(target, collection, 0, { marker });
});

test('document assertions verify seeded state', async () => {
  const marker = randomUUID();
  await seeder.seed(collection, { marker, name: 'kettle', price: 9 });

  const document = await assertDocumentExists(target, collection, { marker });
  expect(document).toMatchObject({ name: 'kettle' });
  await assertFieldValues(target, collection, { marker }, { name: 'kettle', price: 9 });
  await assertDocumentAbsent(target, collection, { marker: `absent-${marker}` });
});

test('assertions fail with DbAssertionError against real state', async () => {
  const marker = randomUUID();
  await seeder.seed(collection, { marker, price: 9 });

  await expect(assertDocumentExists(target, collection, { marker: 'nothing' })).rejects.toThrow(
    DbAssertionError,
  );
  await expect(assertFieldValues(target, collection, { marker }, { price: 10 })).rejects.toThrow(
    /price/,
  );
});
