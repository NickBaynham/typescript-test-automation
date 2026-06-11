/**
 * Sample REST API: an items service for platform testing. Storage is in
 * memory for Phase 2; Phase 3 moves it to MongoDB so the full-stack scenario
 * can verify database state behind API effects.
 */
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const items = new Map();

// Test fixture: the browser-served sample app calls this API cross-origin.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const send = (res, status, body) => {
  if (body === undefined) {
    res.writeHead(status, corsHeaders);
    res.end();
    return;
  }
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.method === 'GET' && path === '/health') return send(res, 200, { status: 'ok' });
  if (req.method === 'GET' && path === '/items') return send(res, 200, [...items.values()]);

  if (req.method === 'POST' && path === '/items') {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, { detail: 'request body is not valid JSON' });
    }
    if (typeof payload?.name !== 'string' || payload.name.length === 0) {
      return send(res, 422, { detail: 'name must be a non-empty string' });
    }
    const item = { id: randomUUID(), name: payload.name };
    items.set(item.id, item);
    return send(res, 201, item);
  }

  const itemMatch = /^\/items\/([^/]+)$/.exec(path);
  if (itemMatch) {
    const id = itemMatch[1];
    if (req.method === 'GET') {
      const item = items.get(id);
      return item === undefined
        ? send(res, 404, { detail: 'item not found' })
        : send(res, 200, item);
    }
    if (req.method === 'DELETE') {
      return items.delete(id) ? send(res, 204) : send(res, 404, { detail: 'item not found' });
    }
  }

  return send(res, 404, { detail: 'not found' });
});

server.listen(8100, () => {
  process.stdout.write('sample-api listening on 8100\n');
});
