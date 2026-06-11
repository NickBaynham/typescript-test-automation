import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { ApiError, type ApiResponse } from '../../src/api.js';
import {
  ApiAssertionError,
  assertJson,
  assertJsonContains,
  assertMatchesSchema,
  assertStatus,
} from '../../src/assertions.js';

const response = (status: number, body: string): ApiResponse => ({
  status,
  headers: new Headers(),
  text: body,
  json: (): unknown => {
    try {
      return JSON.parse(body);
    } catch {
      throw new ApiError(`response body is not JSON: ${body.slice(0, 200)}`);
    }
  },
});

describe('assertStatus', () => {
  test('passes when the status matches', () => {
    expect(() => {
      assertStatus(response(204, ''), 204);
    }).not.toThrow();
  });

  test('failure message carries expected, actual, and the body', () => {
    const failing = () => {
      assertStatus(response(500, 'kaboom details'), 200);
    };

    expect(failing).toThrow(ApiAssertionError);
    expect(failing).toThrow('expected HTTP 200, got 500');
    expect(failing).toThrow('kaboom details');
  });
});

describe('assertJson', () => {
  test('passes on deep equality', () => {
    expect(() => {
      assertJson(response(200, '{"items":[{"id":"1"}]}'), { items: [{ id: '1' }] });
    }).not.toThrow();
  });

  test('fails with both payloads in the message', () => {
    const failing = () => {
      assertJson(response(200, '{"a":1}'), { a: 2 });
    };

    expect(failing).toThrow(ApiAssertionError);
    expect(failing).toThrow('"a":2');
    expect(failing).toThrow('"a":1');
  });

  test('propagates unexpected json() errors unchanged', () => {
    const broken: ApiResponse = {
      status: 200,
      headers: new Headers(),
      text: '',
      json: () => {
        throw new TypeError('not an ApiError');
      },
    };

    expect(() => {
      assertJson(broken, {});
    }).toThrow(TypeError);
  });

  test('fails with the body snippet when the body is not JSON', () => {
    const failing = () => {
      assertJson(response(200, '<html>'), {});
    };

    expect(failing).toThrow(ApiAssertionError);
    expect(failing).toThrow('<html>');
  });
});

describe('assertJsonContains', () => {
  test('passes when every expected pair is present', () => {
    expect(() => {
      assertJsonContains(response(200, '{"id":"7","name":"kettle","extra":true}'), {
        name: 'kettle',
      });
    }).not.toThrow();
  });

  test('fails naming the mismatched keys', () => {
    const failing = () => {
      assertJsonContains(response(200, '{"name":"kettle"}'), { name: 'teapot', id: '1' });
    };

    expect(failing).toThrow(ApiAssertionError);
    expect(failing).toThrow('id');
    expect(failing).toThrow('name');
  });

  test('fails when the payload is not an object', () => {
    expect(() => {
      assertJsonContains(response(200, '[1,2]'), {});
    }).toThrow('expected a JSON object');
  });
});

describe('assertMatchesSchema', () => {
  const itemSchema = z.object({ id: z.string(), name: z.string().min(1) });

  test('returns the typed payload on success', () => {
    const item = assertMatchesSchema(response(200, '{"id":"7","name":"kettle"}'), itemSchema);

    expect(item.name).toBe('kettle');
  });

  test('reports every violation with its path', () => {
    const failing = () => {
      assertMatchesSchema(response(200, '{"id":7,"name":""}'), itemSchema);
    };

    expect(failing).toThrow(ApiAssertionError);
    expect(failing).toThrow(/id/);
    expect(failing).toThrow(/name/);
  });
});
