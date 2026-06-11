import { describe, expect, test } from 'vitest';
import { ApiClient, ApiError, type FetchLike } from '../../src/api.js';

interface Captured {
  url: string;
  init: RequestInit;
}

const fakeFetch = (status = 200, body = '{}', headers: Record<string, string> = {}) => {
  const calls: Captured[] = [];
  const fetchFn: FetchLike = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(body, { status, headers }));
  };
  return { calls, fetchFn };
};

const headerOf = (init: RequestInit, name: string): string | undefined =>
  new Headers(init.headers).get(name) ?? undefined;

describe('ApiClient', () => {
  test('get composes the URL from base, path, and query params', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    await client.get('/items', { params: { limit: '5', q: 'tea pot' } });

    expect(calls[0]?.url).toBe('http://localhost:8100/items?limit=5&q=tea+pot');
    expect(calls[0]?.init.method).toBe('GET');
  });

  test('default headers and bearer token apply to every request', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', {
      fetchFn,
      headers: { 'X-Suite': 'platform' },
      bearerToken: 'sekret',
    });

    await client.get('/health');

    expect(headerOf(calls[0]?.init ?? {}, 'X-Suite')).toBe('platform');
    expect(headerOf(calls[0]?.init ?? {}, 'Authorization')).toBe('Bearer sekret');
  });

  test('per-request headers override the defaults', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', {
      fetchFn,
      headers: { 'X-Suite': 'platform' },
    });

    await client.get('/health', { headers: { 'X-Suite': 'override' } });

    expect(headerOf(calls[0]?.init ?? {}, 'X-Suite')).toBe('override');
  });

  test('post serializes the JSON body and sets the content type', async () => {
    const { calls, fetchFn } = fakeFetch(201);
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    await client.post('/items', { body: { name: 'kettle' } });

    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe('{"name":"kettle"}');
    expect(headerOf(calls[0]?.init ?? {}, 'Content-Type')).toBe('application/json');
  });

  test('responses expose status, text, and parsed json', async () => {
    const { fetchFn } = fakeFetch(201, '{"id":"1","name":"kettle"}');
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    const response = await client.post('/items', { body: { name: 'kettle' } });

    expect(response.status).toBe(201);
    expect(response.text).toBe('{"id":"1","name":"kettle"}');
    expect(response.json()).toEqual({ id: '1', name: 'kettle' });
  });

  test('json() raises ApiError with a body snippet when the body is not JSON', async () => {
    const { fetchFn } = fakeFetch(500, '<html>boom</html>');
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    const response = await client.get('/health');

    expect(() => response.json()).toThrow(ApiError);
    expect(() => response.json()).toThrow('<html>boom</html>');
  });

  test('send dispatches a declarative call with defaults applied', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    await client.send({ path: '/items' });
    await client.send({ method: 'DELETE', path: '/items/7' });

    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.url).toBe('http://localhost:8100/items');
    expect(calls[1]?.init.method).toBe('DELETE');
    expect(calls[1]?.url).toBe('http://localhost:8100/items/7');
  });

  test('put and delete dispatch with their methods', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    await client.put('/items/7', { body: { name: 'renamed' } });
    await client.delete('/items/7');

    expect(calls[0]?.init.method).toBe('PUT');
    expect(calls[1]?.init.method).toBe('DELETE');
  });

  test('base URLs with a path prefix keep the prefix', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('https://api.example.com/v1', { fetchFn });

    await client.get('/items');

    expect(calls[0]?.url).toBe('https://api.example.com/v1/items');
  });

  test('send rejects an invalid call with ApiError naming the issues', async () => {
    const { fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', { fetchFn });

    await expect(client.send({ path: '' })).rejects.toThrow(ApiError);
    await expect(client.send({ path: '' })).rejects.toThrow('path');
  });

  test('requests carry an abort signal for the timeout', async () => {
    const { calls, fetchFn } = fakeFetch();
    const client = new ApiClient('http://localhost:8100', { fetchFn, timeoutMs: 250 });

    await client.get('/health');

    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });
});
