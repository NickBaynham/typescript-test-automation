import { describe, expect, test } from 'vitest';
import { joinUrl } from '../../src/urls.js';

describe('joinUrl', () => {
  test.each([
    ['bare origin', 'http://localhost:8100', '/items', 'http://localhost:8100/items'],
    [
      'origin with trailing slash',
      'http://localhost:8100/',
      '/items',
      'http://localhost:8100/items',
    ],
    [
      'base path prefix is preserved',
      'https://api.example.com/v1',
      '/items',
      'https://api.example.com/v1/items',
    ],
    [
      'base path prefix with trailing slash',
      'https://api.example.com/v1/',
      '/items',
      'https://api.example.com/v1/items',
    ],
    ['root path', 'http://localhost:3100', '/', 'http://localhost:3100/'],
    [
      'nested path',
      'https://api.example.com/v1',
      '/items/7/tags',
      'https://api.example.com/v1/items/7/tags',
    ],
  ])('%s', (_case, base, path, expected) => {
    expect(joinUrl(base, path)).toBe(expected);
  });
});
