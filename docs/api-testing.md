# API Testing

The API layer lives in `src/api.ts` (client) and `src/assertions.ts` (response assertions). Integration tests live in `tests/integration/` and run via `pnpm test:integration` (part of `make test`).

## The client

`ApiClient` wraps native fetch with a base URL, default headers, optional bearer auth, and a timeout. The base URL comes from environment configuration, never from test code.

```typescript
import { ApiClient } from '../../src/api.js';
import { loadConfig } from '../../src/config.js';

const client = new ApiClient(loadConfig().api.baseUrl);

const response = await client.post('/items', { body: { name: 'kettle' } });
```

Authenticated targets take a bearer token from the environment (secrets are environment variables only):

```typescript
const client = new ApiClient(config.api.baseUrl, { bearerToken: process.env.API_TOKEN });
```

Calls can also be declared as data and dispatched with `send`, e.g. when test cases are table-driven:

```typescript
await client.send({ method: 'DELETE', path: `/items/${id}` });
```

## Assertions

All helpers throw `ApiAssertionError` with messages that diagnose the failure from the report alone (expected vs actual, body snippets, every schema violation).

| Helper                                  | Asserts                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `assertStatus(response, 200)`           | Status code; failure message includes the body           |
| `assertJson(response, value)`           | Full payload deep-equality                               |
| `assertJsonContains(response, partial)` | The JSON object carries every expected key-value pair    |
| `assertMatchesSchema(response, schema)` | Payload validates against a Zod schema; returns it typed |

`assertMatchesSchema` returns the parsed, typed value, so validation and extraction are one step:

```typescript
const item = assertMatchesSchema(created, z.object({ id: z.string(), name: z.string() }));
await client.get(`/items/${item.id}`);
```

## Pointing the platform at a real API

The dockerized sample API (`sample-api/`, an in-memory items service) is the default target on `http://localhost:8100`. For a remote hosted API:

```
TARGET_MODE=remote UI_BASE_URL=https://app.example.com API_BASE_URL=https://api.example.com make test
```

Remote mode refuses to run unless every target URL is explicit, so localhost defaults can never leak into a remote run.
