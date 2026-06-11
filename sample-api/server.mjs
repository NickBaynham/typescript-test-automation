/**
 * Sample REST API: a MongoDB-backed items service for platform testing.
 * Storage lives in the `items` collection so the platform's full-stack
 * scenario can verify database state behind API effects.
 */
import { createServer } from 'node:http';
import { MongoClient, ObjectId } from 'mongodb';

const mongoUrl = process.env.MONGO_URL ?? 'mongodb://localhost:27100';
const mongoDatabase = process.env.MONGO_DATABASE ?? 'sampledb';

const client = new MongoClient(mongoUrl);
const items = client.db(mongoDatabase).collection('items');

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

const toItem = (document) => ({ id: String(document._id), name: document.name });

const objectId = (value) => {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
};

// A crashed fixture turns every later test failure into connection noise, so
// unexpected errors (e.g. a database blip) answer 500 instead of killing the
// process.
const server = createServer((req, res) => {
  handle(req, res).catch(() => send(res, 500, { detail: 'internal server error' }));
});

const handle = async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.method === 'GET' && path === '/health') return send(res, 200, { status: 'ok' });
  if (req.method === 'GET' && path === '/items') {
    return send(res, 200, (await items.find().toArray()).map(toItem));
  }

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
    const result = await items.insertOne({ name: payload.name });
    return send(res, 201, { id: String(result.insertedId), name: payload.name });
  }

  const itemMatch = /^\/items\/([^/]+)$/.exec(path);
  if (itemMatch) {
    const id = objectId(itemMatch[1]);
    if (id === null) return send(res, 404, { detail: 'item not found' });
    if (req.method === 'GET') {
      const document = await items.findOne({ _id: id });
      return document === null
        ? send(res, 404, { detail: 'item not found' })
        : send(res, 200, toItem(document));
    }
    if (req.method === 'DELETE') {
      const result = await items.deleteOne({ _id: id });
      return result.deletedCount === 0
        ? send(res, 404, { detail: 'item not found' })
        : send(res, 204);
    }
  }

  return send(res, 404, { detail: 'not found' });
};

server.listen(8100, () => {
  process.stdout.write('sample-api listening on 8100\n');
});
