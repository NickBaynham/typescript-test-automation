import { isDeepStrictEqual } from 'node:util';
import type { Document } from 'mongodb';
import type { ZodType } from 'zod';
import { ApiError, type ApiResponse } from './api.js';
import type { MongoTarget } from './db.js';

/**
 * Raised when a response assertion fails. Messages carry enough context to
 * diagnose the failure from the test report alone.
 */
export class ApiAssertionError extends Error {
  override name = 'ApiAssertionError';
}

function payload(response: ApiResponse): unknown {
  try {
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiAssertionError(error.message);
    }
    throw error;
  }
}

/** Asserts the status code; the failure message includes the body. */
export function assertStatus(response: ApiResponse, expected: number): void {
  if (response.status !== expected) {
    throw new ApiAssertionError(
      `expected HTTP ${String(expected)}, got ${String(response.status)}: ${response.text.slice(0, 500)}`,
    );
  }
}

/** Asserts the full JSON payload deep-equals the expected value. */
export function assertJson(response: ApiResponse, expected: unknown): void {
  const actual = payload(response);
  if (!isDeepStrictEqual(actual, expected)) {
    throw new ApiAssertionError(
      `expected payload ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

/** Asserts the JSON object contains every expected key-value pair. */
export function assertJsonContains(
  response: ApiResponse,
  expected: Readonly<Record<string, unknown>>,
): void {
  const actual = payload(response);
  if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
    throw new ApiAssertionError(`expected a JSON object, got ${JSON.stringify(actual)}`);
  }
  const actualEntries = new Map(Object.entries(actual as Record<string, unknown>));
  const mismatched = Object.entries(expected)
    .filter(([key, value]) => !isDeepStrictEqual(actualEntries.get(key), value))
    .map(([key]) => key);
  if (mismatched.length > 0) {
    throw new ApiAssertionError(
      `payload mismatch for ${mismatched.sort().join(', ')}: ` +
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

/** Raised when a database state assertion fails. */
export class DbAssertionError extends Error {
  override name = 'DbAssertionError';
}

/** Asserts a document matching the query exists; returns it. */
export async function assertDocumentExists(
  target: MongoTarget,
  collection: string,
  query: Document,
): Promise<Document> {
  const document = await target.collection(collection).findOne(query);
  if (document === null) {
    throw new DbAssertionError(`no document in '${collection}' matches ${JSON.stringify(query)}`);
  }
  return document;
}

/** Asserts no document matches the query. */
export async function assertDocumentAbsent(
  target: MongoTarget,
  collection: string,
  query: Document,
): Promise<void> {
  const document = await target.collection(collection).findOne(query);
  if (document !== null) {
    throw new DbAssertionError(
      `expected no document in '${collection}' matching ${JSON.stringify(query)}, ` +
        `found ${JSON.stringify(document)}`,
    );
  }
}

/** Asserts the matching document carries every expected field value. */
export async function assertFieldValues(
  target: MongoTarget,
  collection: string,
  query: Document,
  expected: Document,
): Promise<void> {
  const document = await assertDocumentExists(target, collection, query);
  const fields = new Map(Object.entries(document));
  const mismatched = Object.entries(expected)
    .filter(([field, value]) => !isDeepStrictEqual(fields.get(field), value))
    .map(([field]) => field);
  if (mismatched.length > 0) {
    throw new DbAssertionError(
      `field mismatch in '${collection}' for ${mismatched.sort().join(', ')}: ` +
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(document)}`,
    );
  }
}

/** Asserts how many documents match the query (all documents when omitted). */
export async function assertCollectionCount(
  target: MongoTarget,
  collection: string,
  expected: number,
  query: Document = {},
): Promise<void> {
  const actual = await target.collection(collection).countDocuments(query);
  if (actual !== expected) {
    throw new DbAssertionError(
      `expected ${String(expected)} documents in '${collection}' ` +
        `matching ${JSON.stringify(query)}, got ${String(actual)}`,
    );
  }
}

/** Asserts the JSON payload matches the Zod schema; returns the typed value. */
export function assertMatchesSchema<T>(response: ApiResponse, schema: ZodType<T>): T {
  const parsed = schema.safeParse(payload(response));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('/') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new ApiAssertionError(`schema validation failed: ${details}`);
  }
  return parsed.data;
}
