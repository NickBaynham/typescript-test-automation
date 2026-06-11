import { MongoClient, type Collection, type Document, type ObjectId } from 'mongodb';
import type { PlatformConfig } from './config.js';

/**
 * Connection to the MongoDB database under test. The underlying client
 * connects lazily; construction never blocks on an unreachable server.
 */
export class MongoTarget {
  private readonly client: MongoClient;
  private readonly databaseName: string;

  constructor(
    url: string,
    database: string,
    options: { timeoutMs?: number; client?: MongoClient } = {},
  ) {
    this.client =
      options.client ??
      new MongoClient(url, { serverSelectionTimeoutMS: options.timeoutMs ?? 2000 });
    this.databaseName = database;
  }

  /** Builds the target from platform configuration. */
  static fromConfig(config: PlatformConfig): MongoTarget {
    return new MongoTarget(config.mongo.url, config.mongo.database);
  }

  /** The named collection in the database under test. */
  collection(name: string): Collection {
    return this.client.db(this.databaseName).collection(name);
  }

  /** Whether the server answers within the timeout. */
  async ping(): Promise<boolean> {
    try {
      await this.client.db(this.databaseName).command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  close(): Promise<void> {
    return this.client.close();
  }
}

/**
 * Seeds test data and removes exactly what it seeded. Cleanup deletes by
 * recorded id and never drops collections, so seeding is safe against
 * databases holding data the test does not own.
 */
export class MongoSeeder {
  private readonly seeded: { collection: string; id: ObjectId }[] = [];

  constructor(private readonly target: MongoTarget) {}

  /** Inserts documents into the collection; returns their ids. */
  async seed(collection: string, ...documents: Document[]): Promise<ObjectId[]> {
    let result;
    try {
      result = await this.target.collection(collection).insertMany(documents);
    } catch (error) {
      // A failed bulk write may still have inserted some documents; record
      // them so cleanup keeps its delete-everything-seeded guarantee.
      const partial = (error as { result?: { insertedIds?: Record<number, ObjectId> } }).result
        ?.insertedIds;
      if (partial !== undefined) {
        this.seeded.push(...Object.values(partial).map((id) => ({ collection, id })));
      }
      throw error;
    }
    const ids = Object.values(result.insertedIds);
    this.seeded.push(...ids.map((id) => ({ collection, id })));
    return ids;
  }

  /** Deletes every document this seeder inserted. */
  async cleanup(): Promise<void> {
    for (const { collection, id } of this.seeded) {
      await this.target.collection(collection).deleteOne({ _id: id });
    }
    this.seeded.length = 0;
  }
}
