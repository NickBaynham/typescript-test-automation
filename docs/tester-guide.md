# Tester Guide

How to automate tests with this platform. Every worked example below is a real test from this repository, runs in `make test`, and can be copied as a starting point.

## 1. Introduction

The platform tests web applications at three layers, each building on the one before:

| Layer    | What it verifies                         | Tooling                                  | Suite                |
| -------- | ---------------------------------------- | ---------------------------------------- | -------------------- |
| UI       | What a user sees and does in a browser   | Playwright, page objects                 | `tests/e2e/`         |
| API      | What the REST layer accepts and returns  | `ApiClient`, response assertions, Zod    | `tests/integration/` |
| Database | What state the system actually persisted | `MongoTarget`, seeding, state assertions | `tests/integration/` |

A fourth pattern, the full-stack scenario, chains all three: act in the UI, confirm the API effect, verify the database state.

Prerequisites: Node 24+, pnpm 11+, Docker, and (on Linux/macOS/WSL2) make — see the README's Cross-Platform Support section for native Windows.

First run:

```
make install            # dependencies
make install-browsers   # Playwright engines + host browser detection
make docker-up          # sample app, sample API, MongoDB (waits on healthchecks)
make test               # unit, integration, and e2e suites
make report             # browse the Allure report
make docker-down
```

## 2. Testing at each layer

### UI tests with page objects

Page objects live in `src/pages/` and extend `BasePage`, which provides the locator conventions (role first, then label, then test id — see [page-objects.md](page-objects.md)). Tests never use raw selectors.

Worked example — the page object (`src/pages/sign-in-page.ts`):

```typescript
export class SignInPage extends BasePage {
  constructor(page: Page) {
    super(page, '/');
  }

  get heading(): Locator {
    return this.byRole('heading', { name: 'Sign in' });
  }

  get welcomeStatus(): Locator {
    return this.byRole('status');
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.byLabel('Username').fill(username);
    await this.byLabel('Password').fill(password);
    await this.byTestId('login-submit').click();
  }
}
```

Worked example — the test (`tests/e2e/sign-in.spec.ts`):

```typescript
test('signing in greets the user by name', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto(ui.baseUrl);

  await signInPage.signIn('nick', 'secret');

  await expect(signInPage.welcomeStatus).toHaveText('Welcome, nick');
});
```

Every e2e test runs once per available browser: `playwright.config.ts` builds its browser matrix from `config/browsers.json`, written by `make install-browsers`. A browser that is not available on the host is skipped, never failed.

### API tests with the client and assertions

`ApiClient` (see [api-testing.md](api-testing.md)) wraps fetch with the configured base URL; assertion helpers throw with diagnostic messages. `assertMatchesSchema` validates against a Zod schema and returns the typed payload.

Worked example (`tests/integration/items-api.test.ts`):

```typescript
const client = new ApiClient(loadConfig().api.baseUrl);
const itemSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

test('created items can be fetched, listed, and deleted', async () => {
  const created = await client.post('/items', { body: { name: 'integration kettle' } });
  assertStatus(created, 201);
  const item = assertMatchesSchema(created, itemSchema);

  const fetched = await client.get(`/items/${item.id}`);
  assertStatus(fetched, 200);
  assertJsonContains(fetched, { id: item.id, name: 'integration kettle' });

  const deleted = await client.delete(`/items/${item.id}`);
  assertStatus(deleted, 204);
});
```

### Database tests with seeding and state assertions

`MongoTarget` connects from configuration; `MongoSeeder` gives per-test isolation — cleanup deletes exactly what was seeded (see [database-testing.md](database-testing.md)).

Worked example (`tests/integration/db.test.ts`):

```typescript
const target = MongoTarget.fromConfig(loadConfig());
const seeder = new MongoSeeder(target);

afterEach(async () => {
  await seeder.cleanup();
});

test('document assertions verify seeded state', async () => {
  const marker = randomUUID();
  await seeder.seed(collection, { marker, name: 'kettle', price: 9 });

  await assertFieldValues(target, collection, { marker }, { name: 'kettle', price: 9 });
  await assertDocumentAbsent(target, collection, { marker: `absent-${marker}` });
});
```

### The full-stack pattern

Anchor on a UI action, confirm the API effect, verify the database document, and clean up what the test created. Worked example (`tests/e2e/full-stack.spec.ts`):

```typescript
test('a UI action reaches the API and the database', async ({ page }) => {
  const name = `fullstack-${randomUUID().slice(0, 8)}`;

  await itemsPage.goto(config.ui.baseUrl);
  await itemsPage.addItem(name);
  await expect(itemsPage.itemList.getByText(name)).toBeVisible();

  const items = assertMatchesSchema(await api.get('/items'), z.array(itemSchema));
  const match = items.find((item) => item.name === name);
  if (match === undefined) {
    throw new Error(`item ${name} visible in the UI but missing from the API listing`);
  }

  const document = await assertDocumentExists(mongo, 'items', { name });
  expect(String(document._id)).toBe(match.id);

  assertStatus(await api.delete(`/items/${match.id}`), 204);
});
```

## 3. Designing tests for the framework

- **Choose the lowest layer that can prove the behavior.** UI tests are the slowest and flakiest; use them for user-visible flows, the API layer for contract behavior, the database layer for persistence rules. The full-stack pattern is for one representative journey, not for every case.
- **Isolation: every test owns its data.** Seed through `MongoSeeder` or create through the API, and clean up in the same test or an `afterEach`. Use a UUID marker in test data so queries never collide with concurrent runs or leftover state. Never assume a collection is empty.
- **Never assert only absence.** Absence checks pass before the application reacts. Anchor on a positive state change first, then assert the absence beside it.
- **Naming and structure.** Platform code is tested in `tests/unit/` (gated at 90 percent coverage); application-facing tests go in `tests/integration/` (API, database) and `tests/e2e/` (browser). Test titles state observable behavior ("created items can be fetched"), not implementation.
- **Environment configuration, never literals.** Base URLs and the Mongo target always come from `loadConfig()`. In remote mode the platform refuses to run unless every target URL is explicit, so localhost defaults cannot leak into a remote run.
- **Page objects encapsulate, tests assert.** Locators and interactions belong in the page object; expectations belong in the test. If a page object needs a CSS selector, treat it as a testability gap in the application.

## 4. Troubleshooting

| Symptom                                                                                           | Cause                                                                                  | Fix                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration or e2e tests fail with `ECONNREFUSED`, or "MongoDB not reachable at ..."              | The sample stack is not running                                                        | `make docker-up` (waits on healthchecks); confirm with `docker compose ps`                                                                                            |
| Playwright fails at config load: "config/browsers.json not found" or "browsers file is malformed" | No browser inventory on this host, or a corrupt one                                    | `make install-browsers` (or `pnpm build && pnpm install:browsers`)                                                                                                    |
| "no browsers are available on this host"                                                          | Every engine install failed and no host browser was detected                           | Re-run `make install-browsers` and read its output; check network access to the Playwright CDN                                                                        |
| `pnpm test:unit` fails the coverage threshold when running a single file                          | The 90 percent gate measures the whole platform package, so subset runs under-cover it | Run the full unit suite for the gate; use `pnpm vitest run <file>` (no `--coverage`) while iterating                                                                  |
| "remote target mode requires explicit values for: ..."                                            | `TARGET_MODE=remote` without every target URL                                          | Set `UI_BASE_URL`, `API_BASE_URL`, and `MONGO_URL` explicitly — this guard is intentional                                                                             |
| `make docker-up` fails with "port is already allocated"                                           | Another process owns 3100, 8100, or 27100                                              | Remap and repoint, e.g. `SAMPLE_APP_PORT=3200 SAMPLE_API_PORT=8200 MONGO_PORT=27200 make docker-up`, then set the matching `*_URL` variables for `make test`          |
| A test failed and you need to see what happened                                                   | Failure artifacts are captured automatically                                           | Screenshots and traces are under `test-results/` (open traces with `pnpm exec playwright show-trace <trace.zip>`); `make report` opens the Allure report with history |
