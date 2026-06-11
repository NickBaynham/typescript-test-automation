# Database Testing

The MongoDB layer lives in `src/db.ts` (connection and seeding) and `src/assertions.ts` (state assertions). Database integration tests live in `tests/integration/` and run via `pnpm test:integration` (part of `make test`).

## Connecting

`MongoTarget` wraps the official mongodb driver with configuration-driven connection management. Construction is lazy and never blocks on an unreachable server; `ping()` tells you whether it answers.

```typescript
import { MongoTarget } from '../../src/db.js';
import { loadConfig } from '../../src/config.js';

const target = MongoTarget.fromConfig(loadConfig());
if (!(await target.ping())) {
  throw new Error('database not reachable; start the stack with make docker-up');
}
```

Always `close()` the target when the suite finishes.

## Seeding with per-test isolation

`MongoSeeder` records the id of every document it inserts and `cleanup()` deletes exactly those — it never drops collections, so seeding is safe against databases holding data the tests do not own. Pair `seed` with an `afterEach` cleanup for per-test isolation:

```typescript
const seeder = new MongoSeeder(target);
afterEach(async () => {
  await seeder.cleanup();
});

test('finds the seeded order', async () => {
  await seeder.seed('orders', { customer: 'acme', total: 90 });
  await assertFieldValues(target, 'orders', { customer: 'acme' }, { total: 90 });
});
```

Use a unique marker field (e.g. a UUID) in seeded documents so queries cannot collide with concurrent data.

## State assertions

All helpers throw `DbAssertionError` with the collection, query, and offending state in the message.

| Helper                                                 | Asserts                                                  |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `assertDocumentExists(target, collection, query)`      | A matching document exists; returns it                   |
| `assertDocumentAbsent(target, collection, query)`      | No document matches                                      |
| `assertFieldValues(target, collection, query, fields)` | The matching document carries every expected field value |
| `assertCollectionCount(target, collection, n, query?)` | How many documents match (all documents when omitted)    |

## The full-stack scenario

`tests/e2e/full-stack.spec.ts` is the platform's capstone: it adds an item through the sample app UI (Phase 1), confirms the REST API serves it (Phase 2), and verifies the document in MongoDB (Phase 3) — then deletes what it created.

## Pointing the platform at a real database

The dockerized MongoDB is the default target on `mongodb://localhost:27100` (database `sampledb`). For a remote instance set `MONGO_URL` (and `MONGO_DATABASE` if it differs); in remote target mode `MONGO_URL` is required alongside the UI and API URLs:

```
TARGET_MODE=remote UI_BASE_URL=... API_BASE_URL=... MONGO_URL=mongodb://db.example.com:27017 make test
```

Credentials belong in the URL via environment variables only, never in code or committed files.
