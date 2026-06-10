# typescript-test-automation

A TypeScript based software test automation platform. Targets React UIs (Playwright), REST APIs, and MongoDB, built in phases; Phase 0 (this state) delivers the platform skeleton with full quality tooling.

## Project Layout

```
src/                Platform code (the test automation framework itself)
tests/unit/         Unit tests of platform code
tests/integration/  Integration tests against target applications (Phase 2+)
tests/e2e/          End-to-end tests against target applications (Phase 1+)
dist/               Compiled output (generated)
```

Platform tests vs application tests: `tests/unit/` exercises the platform's own modules and gates every change with a 90 percent coverage threshold. `tests/e2e/` and `tests/integration/` are reserved for tests that target applications under test, beginning in Phase 1.

## Prerequisites

- Node.js 24 LTS or later
- pnpm 11 or later (`corepack enable` ships it with Node)
- GNU Make (optional on Windows; see Cross-Platform Support)

## Setup

```
make install
```

## Development Workflow

Every command exists as a package.json script; the Makefile is a thin wrapper. The two columns below are equivalent, so use whichever fits your platform.

| Make            | pnpm            | Purpose                                           |
| --------------- | --------------- | ------------------------------------------------- |
| `make install`  | `pnpm install`  | Install dependencies                              |
| `make lint`     | `pnpm lint`     | ESLint (with security rules), Prettier check, tsc |
| `make format`   | `pnpm format`   | Apply Prettier formatting                         |
| `make test`     | `pnpm test`     | Unit tests with coverage (90 percent threshold)   |
| `make build`    | `pnpm build`    | Compile TypeScript to dist/                       |
| `make run`      | `pnpm start`    | Run the compiled platform (make builds first)     |
| `make security` | `pnpm security` | Audit dependencies for known vulnerabilities      |

All code must pass `make lint` and `make test` before a task is considered done.

## Cross-Platform Support

The platform supports Linux, macOS, and Windows (native and WSL2).

- Linux and macOS: use the Make targets directly.
- Windows (WSL2, recommended): a full Linux environment; install Node, pnpm, and make inside WSL2 and use the Make targets directly.
- Windows (native): `make` does not ship with Windows. Run the pnpm scripts directly (`pnpm lint`, `pnpm test`, ...) from PowerShell or cmd; for `make run`, run `pnpm build` then `pnpm start`. Alternatively install GNU Make via Chocolatey or Scoop and use the Make targets.

To keep this guarantee, package.json scripts must remain portable: no shell-specific syntax (no `rm -rf`, no inline `VAR=value` assignments); use Node-based tools for file operations.

## Configuration

Platform settings come from environment variables, parsed and validated with Zod in `src/config.ts`. Secrets must only ever be provided through environment variables, never committed to code or config files.

| Variable       | Values                           | Default  | Purpose                            |
| -------------- | -------------------------------- | -------- | ---------------------------------- |
| `PLATFORM_ENV` | `local`, `ci`, `remote`          | `local`  | Selects the environment profile    |
| `TARGET_MODE`  | `docker`, `remote`               | `docker` | Dockerized or remote hosted target |
| `LOG_LEVEL`    | `debug`, `info`, `warn`, `error` | `info`   | Structured logger threshold        |

## Further Documentation

- [CHANGELOG.md](CHANGELOG.md) - changes and feature list
- [TODO.md](TODO.md) - planned and in-progress work
