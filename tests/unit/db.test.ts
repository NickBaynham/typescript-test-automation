import { ObjectId, type MongoClient } from 'mongodb';
import { describe, expect, test } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { MongoSeeder, MongoTarget } from '../../src/db.js';

const fakeClient = (commandOk: boolean) => {
  const calls: string[] = [];
  const client = {
    db: (name: string) => ({
      command: (cmd: Record<string, number>) => {
        calls.push(`command ${name} ${Object.keys(cmd).join('')}`);
        return commandOk ? Promise.resolve({ ok: 1 }) : Promise.reject(new Error('down'));
      },
      collection: (collectionName: string) => ({ marker: `${name}.${collectionName}` }),
    }),
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
  } as unknown as MongoClient;
  return { client, calls };
};

describe('MongoTarget', () => {
  test('collection resolves names inside the configured database', () => {
    const { client } = fakeClient(true);
    const target = new MongoTarget('mongodb://localhost:27100', 'sampledb', { client });

    expect(target.collection('items')).toEqual({ marker: 'sampledb.items' });
  });

  test('ping reports true when the server answers', async () => {
    const { client } = fakeClient(true);
    const target = new MongoTarget('mongodb://localhost:27100', 'sampledb', { client });

    await expect(target.ping()).resolves.toBe(true);
  });

  test('ping reports false when the server is unreachable', async () => {
    const { client } = fakeClient(false);
    const target = new MongoTarget('mongodb://localhost:27100', 'sampledb', { client });

    await expect(target.ping()).resolves.toBe(false);
  });

  test('close closes the underlying client', async () => {
    const { client, calls } = fakeClient(true);
    const target = new MongoTarget('mongodb://localhost:27100', 'sampledb', { client });

    await target.close();

    expect(calls).toContain('close');
  });

  test('fromConfig wires the configured URL and database', () => {
    const target = MongoTarget.fromConfig(loadConfig({ MONGO_DATABASE: 'otherdb' }));

    expect(target).toBeInstanceOf(MongoTarget);
  });
});

const fakeTarget = () => {
  const inserted: { collection: string; documents: object[] }[] = [];
  const deleted: { collection: string; id: ObjectId }[] = [];
  const target = {
    collection: (name: string) => ({
      insertMany: (documents: object[]) => {
        inserted.push({ collection: name, documents });
        const insertedIds = Object.fromEntries(
          documents.map((_, index) => [index, new ObjectId()]),
        );
        return Promise.resolve({ insertedIds });
      },
      deleteOne: (query: { _id: ObjectId }) => {
        deleted.push({ collection: name, id: query._id });
        return Promise.resolve({ deletedCount: 1 });
      },
    }),
  } as unknown as MongoTarget;
  return { target, inserted, deleted };
};

describe('MongoSeeder', () => {
  test('seed inserts documents and returns their ids', async () => {
    const { target, inserted } = fakeTarget();
    const seeder = new MongoSeeder(target);

    const ids = await seeder.seed('items', { name: 'a' }, { name: 'b' });

    expect(ids).toHaveLength(2);
    expect(inserted).toEqual([{ collection: 'items', documents: [{ name: 'a' }, { name: 'b' }] }]);
  });

  test('records partially inserted ids when a bulk write fails midway', async () => {
    const survivorId = new ObjectId();
    const deleted: ObjectId[] = [];
    const target = {
      collection: () => ({
        insertMany: () =>
          Promise.reject(
            Object.assign(new Error('duplicate key'), {
              result: { insertedIds: { 0: survivorId } },
            }),
          ),
        deleteOne: (query: { _id: ObjectId }) => {
          deleted.push(query._id);
          return Promise.resolve({ deletedCount: 1 });
        },
      }),
    } as unknown as MongoTarget;
    const seeder = new MongoSeeder(target);

    await expect(seeder.seed('items', { name: 'a' }, { name: 'dup' })).rejects.toThrow(
      'duplicate key',
    );
    await seeder.cleanup();

    expect(deleted).toEqual([survivorId]);
  });

  test('cleanup deletes exactly what was seeded, then forgets it', async () => {
    const { target, deleted } = fakeTarget();
    const seeder = new MongoSeeder(target);
    const itemIds = await seeder.seed('items', { name: 'a' });
    const userIds = await seeder.seed('users', { name: 'u' });

    await seeder.cleanup();
    await seeder.cleanup();

    expect(deleted).toEqual([
      { collection: 'items', id: itemIds[0] },
      { collection: 'users', id: userIds[0] },
    ]);
  });
});
