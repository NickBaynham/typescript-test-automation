import { describe, expect, test } from 'vitest';
import { joinUrl, redactUrl } from '../../src/urls.js';

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

describe('redactUrl', () => {
  test('strips credentials so URLs are safe to log', () => {
    expect(redactUrl('mongodb://admin:s3cr3t@db.example.com:27017')).toBe(
      'mongodb://db.example.com:27017',
    );
  });

  test('leaves credential-free URLs unchanged', () => {
    expect(redactUrl('mongodb://localhost:27100')).toBe('mongodb://localhost:27100');
  });

  test('never throws on unparseable input', () => {
    expect(redactUrl('not a url')).toBe('<unparseable url>');
  });
});
