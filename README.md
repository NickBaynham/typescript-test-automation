# typescript-test-automation

A TypeScript based software test automation platform, built in phases. Current capability: React UI testing with Playwright (page objects, host-aware browser installation, Allure reporting) and REST API testing (typed fetch client, Zod response validation) against dockerized or remote hosted targets, with a cross-platform CI pipeline. MongoDB testing (Phase 3) follows.

## Project Layout

```
src/                Platform code (the test automation framework itself)
src/pages/          Page objects (BasePage plus per-application pages)
tests/unit/         Unit tests of platform code
tests/e2e/          End-to-end tests against the application under test
tests/integration/  Integration tests against the API under test
sample-app/         Dockerized reference React application
sample-api/         Dockerized reference REST API (in-memory items service)
docs/               How-to documentation
config/             Generated browser availability (git ignored)
dist/               Compiled output (generated)
```

Platform tests vs application tests: `tests/unit/` exercises the platform's own modules and gates every change with a 90 percent coverage threshold. `tests/e2e/` and `tests/integration/` target the application under test.

## Prerequisites

- Node.js 24 LTS or later
- pnpm 11 or later (`corepack enable` ships it with Node)
- GNU Make (optional on Windows; see Cross-Platform Support)

## Setup

```
make install            # dependencies
make install-browsers   # Playwright engines + host browser detection
```

Full local test run, including e2e against the sample application:

```
make docker-up
make test
make report             # optional: browse the Allure report
make docker-down
```

## Development Workflow

Every command exists as a package.json script; the Makefile is a thin wrapper. The two columns below are equivalent, so use whichever fits your platform.

| Make                    | pnpm                                      | Purpose                                                                                 |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `make install`          | `pnpm install`                            | Install dependencies                                                                    |
| `make lint`             | `pnpm lint`                               | ESLint (with security rules), Prettier check, tsc                                       |
| `make format`           | `pnpm format`                             | Apply Prettier formatting                                                               |
| `make test`             | `pnpm test`                               | Unit, integration, and e2e suites (start the targets first: `make docker-up`)           |
| -                       | `pnpm test:unit`                          | Unit tests with coverage only (90 percent threshold)                                    |
| -                       | `pnpm test:integration`                   | API integration tests only                                                              |
| `make build`            | `pnpm build`                              | Compile TypeScript to dist/                                                             |
| `make run`              | `pnpm start`                              | Run the compiled platform (make builds first)                                           |
| `make security`         | `pnpm security`                           | Audit dependencies for known vulnerabilities                                            |
| -                       | `pnpm test:e2e`                           | E2e tests only; emits Allure results and failure artifacts                              |
| `make report`           | `pnpm report`                             | Generate the Allure HTML report and open it                                             |
| `make install-browsers` | `pnpm build` then `pnpm install:browsers` | Install supported Playwright browsers, detect host browsers, write config/browsers.json |
| `make docker-build`     | `pnpm docker:build`                       | Build the sample application image                                                      |
| `make docker-run`       | `pnpm docker:run`                         | Run the sample application attached                                                     |
| `make docker-up`        | `pnpm docker:up`                          | Start the sample application detached                                                   |
| `make docker-down`      | `pnpm docker:down`                        | Stop and remove the compose stack                                                       |

All code must pass `make lint` and `make test` before a task is considered done.

## Cross-Platform Support

The platform supports Linux, macOS, and Windows (native and WSL2).

- Linux and macOS: use the Make targets directly.
- Windows (WSL2, recommended): a full Linux environment; install Node, pnpm, and make inside WSL2 and use the Make targets directly.
- Windows (native): `make` does not ship with Windows. Run the pnpm scripts directly (`pnpm lint`, `pnpm test`, ...) from PowerShell or cmd; for `make run`, run `pnpm build` then `pnpm start`. Alternatively install GNU Make via Chocolatey or Scoop and use the Make targets.

To keep this guarantee, package.json scripts must remain portable: no shell-specific syntax (no `rm -rf`, no inline `VAR=value` assignments); use Node-based tools for file operations.

## Sample Applications

`make docker-up` starts both reference targets and waits for their healthchecks:

- `sample-app/`: React application (Vite, unprivileged nginx) on port 3100, targeted by the e2e suite.
- `sample-api/`: REST API (in-memory items service) on port 8100, targeted by the integration suite. Storage moves to MongoDB in Phase 3.

If a default port is taken on your machine, remap it and point the tests at the new port:

```
SAMPLE_APP_PORT=3200 SAMPLE_API_PORT=8200 make docker-up
UI_BASE_URL=http://localhost:3200 API_BASE_URL=http://localhost:8200 make test
```

## Configuration

Platform settings come from environment variables, parsed and validated with Zod in `src/config.ts`. Secrets must only ever be provided through environment variables, never committed to code or config files.

| Variable       | Values                           | Default                                                                   | Purpose                            |
| -------------- | -------------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| `PLATFORM_ENV` | any non-empty label              | `local`                                                                   | Informational environment label    |
| `TARGET_MODE`  | `docker`, `remote`               | `docker`                                                                  | Dockerized or remote hosted target |
| `LOG_LEVEL`    | `debug`, `info`, `warn`, `error` | `info`                                                                    | Structured logger threshold        |
| `UI_BASE_URL`  | any valid URL                    | `http://localhost:3100` when `TARGET_MODE=docker`; required when `remote` | Base URL of the UI under test      |
| `API_BASE_URL` | any valid URL                    | `http://localhost:8100` when `TARGET_MODE=docker`; required when `remote` | Base URL of the API under test     |

Remote mode requires every target URL explicitly, so localhost defaults never leak into a remote run:

```
TARGET_MODE=remote UI_BASE_URL=https://app.example.com API_BASE_URL=https://api.example.com make test
```

## Continuous Integration

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on pushes to main and on pull requests: lint, type checks, unit tests with coverage enforcement, e2e tests against the dockerized sample app, and the dependency audit. Allure results are published as a build artifact; screenshots and traces are retained on failure. A second job runs the platform on native Windows (pnpm scripts, no make) to keep the cross-platform guarantee honest.

## Further Documentation

- [docs/page-objects.md](docs/page-objects.md) - writing page objects and locator conventions
- [docs/api-testing.md](docs/api-testing.md) - the API client, assertions, and targeting real APIs
- [CHANGELOG.md](CHANGELOG.md) - changes and feature list
- [TODO.md](TODO.md) - planned and in-progress work
