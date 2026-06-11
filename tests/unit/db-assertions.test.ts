import { describe, expect, test } from 'vitest';
import type { MongoTarget } from '../../src/db.js';
import {
  assertCollectionCount,
  assertDocumentAbsent,
  assertDocumentExists,
  assertFieldValues,
  DbAssertionError,
} from '../../src/assertions.js';

const matches = (document: Record<string, unknown>, query: Record<string, unknown>) => {
  const fields = new Map(Object.entries(document));
  return Object.entries(query).every(([key, value]) => fields.get(key) === value);
};

const targetWith = (documents: Record<string, unknown>[]) =>
  ({
    collection: () => ({
      findOne: (query: Record<string, unknown>) =>
        Promise.resolve(documents.find((document) => matches(document, query)) ?? null),
      countDocuments: (query: Record<string, unknown> = {}) =>
        Promise.resolve(documents.filter((document) => matches(document, query)).length),
    }),
  }) as unknown as MongoTarget;

describe('assertDocumentExists', () => {
  test('returns the matching document', async () => {
    const target = targetWith([{ name: 'kettle', price: 9 }]);

    const document = await assertDocumentExists(target, 'items', { name: 'kettle' });

    expect(document).toEqual({ name: 'kettle', price: 9 });
  });

  test('fails naming the collection and query when nothing matches', async () => {
    const target = targetWith([]);

    const failing = assertDocumentExists(target, 'items', { name: 'ghost' });

    await expect(failing).rejects.toThrow(DbAssertionError);
    await expect(assertDocumentExists(target, 'items', { name: 'ghost' })).rejects.toThrow(
      /items.*ghost/,
    );
  });
});

describe('assertDocumentAbsent', () => {
  test('passes when nothing matches', async () => {
    await expect(
      assertDocumentAbsent(targetWith([]), 'items', { name: 'x' }),
    ).resolves.toBeUndefined();
  });

  test('fails showing the unexpected document', async () => {
    const target = targetWith([{ name: 'kettle' }]);

    await expect(assertDocumentAbsent(target, 'items', { name: 'kettle' })).rejects.toThrow(
      /expected no document.*kettle/,
    );
  });
});

describe('assertFieldValues', () => {
  test('passes when the document carries every expected field', async () => {
    const target = targetWith([{ name: 'kettle', price: 9, stock: 3 }]);

    await expect(
      assertFieldValues(target, 'items', { name: 'kettle' }, { price: 9 }),
    ).resolves.toBeUndefined();
  });

  test('fails naming the mismatched fields', async () => {
    const target = targetWith([{ name: 'kettle', price: 9 }]);

    const failing = assertFieldValues(target, 'items', { name: 'kettle' }, { price: 10, stock: 1 });

    await expect(failing).rejects.toThrow(DbAssertionError);
    await expect(
      assertFieldValues(target, 'items', { name: 'kettle' }, { price: 10, stock: 1 }),
    ).rejects.toThrow(/price.*stock|stock.*price/);
  });
});

describe('assertCollectionCount', () => {
  test('passes on the expected count with a query', async () => {
    const target = targetWith([{ kind: 'a' }, { kind: 'a' }, { kind: 'b' }]);

    await expect(assertCollectionCount(target, 'items', 2, { kind: 'a' })).resolves.toBeUndefined();
  });

  test('counts all documents when no query is given', async () => {
    const target = targetWith([{ kind: 'a' }, { kind: 'b' }]);

    await expect(assertCollectionCount(target, 'items', 2)).resolves.toBeUndefined();
  });

  test('fails with expected and actual counts', async () => {
    const target = targetWith([{ kind: 'a' }]);

    await expect(assertCollectionCount(target, 'items', 5)).rejects.toThrow(/expected 5.*got 1/);
  });
});
