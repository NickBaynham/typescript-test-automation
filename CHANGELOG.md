# Changelog

## Phase 0 - Basic TypeScript Project (2026-06-10)

### Added

- Project scaffold: pnpm, Node 24 LTS, TypeScript 6 in strict mode, ES modules; platform code in `src/`, platform unit tests in `tests/unit/`, with `tests/e2e/` and `tests/integration/` reserved for application-targeted suites.
- Makefile with `install`, `lint`, `format`, `test`, `build`, `run`, and `security` targets, each a thin wrapper over an equivalent package.json script for native Windows compatibility.
- Quality tooling: ESLint 10 (typescript-eslint strict and stylistic type-checked rules, flat config), Prettier, `tsc --noEmit` type checking.
- Vitest 4 with V8 coverage, 90 percent threshold enforced over the platform package.
- Security gate: `pnpm audit` behind `make security`; eslint-plugin-security recommended rules in the lint configuration.
- Environment configuration loader (`src/config.ts`): Zod-parsed environment variables with per-environment profiles (`local`, `ci`, `remote`), dockerized or remote target selection, and a `ConfigError` naming invalid variables. Developed test-first.
- Structured JSON-line logger (`src/logger.ts`) with level filtering; platform code never uses console.log.
- Documentation: README (layout, workflow, cross-platform support, configuration), this changelog, TODO.md.

### Feature List

- Environment configuration from validated environment variables.
- Structured leveled JSON logging.
- Quality gates: lint, format, types, unit tests with coverage, dependency audit.
- Cross-platform workflow: Linux, macOS, Windows native (pnpm scripts), Windows WSL2 (make).
