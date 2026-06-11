import { isDeepStrictEqual } from 'node:util';
import type { ZodType } from 'zod';
import { ApiError, type ApiResponse } from './api.js';

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
