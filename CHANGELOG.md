# Changelog

## Phase 1 - React UI Testing with Playwright (2026-06-10)

All tasks complete. Definition of Done verified locally; CI pipeline verification pending the first push to GitHub.

### Changed (closing review, 2026-06-10)

- CI workflow: actions bumped to latest majors, token permissions restricted to contents: read, Playwright browser caching added to both jobs.
- Sample app image pinned: nginx-unprivileged 1.31-alpine, pnpm 11.1.3.

### Added (task 8, 2026-06-10)

- Documentation pass: README reflects the full Phase 1 capability (layout, e2e quickstart, remote target example, CI section); changelog and TODO brought current.

### Added

- Playwright (@playwright/test 1.60) with host-aware browser installation: `make install-browsers` installs each Playwright engine the host supports (chromium, firefox, webkit), detects branded host browsers Playwright can drive via channels (chrome, msedge), and writes `config/browsers.json` with `available: true|false` per browser. `playwright.config.ts` enables only available browsers and fails only when none are available.
- Browser detection module (`src/browsers.ts`), developed test-first: per-platform channel executable detection (Linux, macOS, Windows), Zod-validated browsers.json parsing, and the available-browsers selection rule.
- Launch smoke test (`tests/e2e/browser-availability.spec.ts`) proving every browser marked available actually launches.

### Added (task 7, 2026-06-10)

- GitHub Actions CI pipeline: lint, type check, build, host-aware browser installation, dockerized sample app, unit and e2e tests with coverage enforcement, security audit; Allure results published as a build artifact and failure artifacts retained. A second Windows job verifies the native Windows path (pnpm scripts, browser detection, launch smoke).

### Added (task 6, 2026-06-10)

- E2e suite against the sample application: sign-in form, successful sign-in greeting, and empty-submission cases, running on every available browser via `make test` (unit suite first, then e2e).
- `SignInPage` reference page object and a `byLabel` locator helper in `BasePage` (password inputs have no implicit ARIA role; label is the convention for form fields).
- Failure artifacts: screenshots and traces captured on e2e failure under `test-results/`.
- Playwright `baseURL` now comes from the environment configuration (`UI_BASE_URL`).

### Added (task 5, 2026-06-10)

- Allure reporting: allure-playwright reporter emits results to `allure-results/`; `make report` generates and opens the HTML report via the pure-JavaScript Allure 3 CLI (no Java required).

### Added (task 4, 2026-06-10)

- Sample React application (`sample-app/`, Vite + React 19) as the local and CI reference target: a minimal sign-in flow built for the platform's locator conventions. Multi-stage Docker image on unprivileged nginx (non-root).
- Docker compose stack (`compose.yaml`) with configurable host port (`SAMPLE_APP_PORT`, default 3000) and `make docker-build`, `make docker-run`, `make docker-up`, `make docker-down` targets.

### Added (task 3, 2026-06-10)

- UI target settings in the configuration module: `ui.baseUrl` from `UI_BASE_URL`, defaulting to the dockerized sample app for docker targets and required for remote targets.

### Added (task 2, 2026-06-10)

- Page object pattern: `BasePage` (`src/pages/base-page.ts`) with route-path navigation against a configurable base URL and React-suited locator conventions (ARIA role and accessible name first, data-testid fallback). Documented in docs/page-objects.md.

### Fixed (code review remediation, 2026-06-10)

- Logger: caller-supplied context can no longer override the structured `level` and `message` fields.
- config/browsers.json is written and read at a project-root-anchored absolute path instead of relative to the working directory.
- A spawn-level failure during browser installation (for example pnpm missing from PATH) is now logged with its cause instead of being silently recorded as unavailable.
- `ConfigError` and `BrowsersFileError` carry their class names in serialized output.
- Windows per-user browser installs under LOCALAPPDATA are now detected.
- Malformed browsers.json errors report every validation issue, consistent with the configuration loader.
- The no-browsers-available error names both the make and pnpm commands.
- Browser install orchestration extracted to a unit-tested `installBrowsers(deps)` function now under the coverage gate; the e2e smoke additionally asserts each project launches its expected engine.

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
