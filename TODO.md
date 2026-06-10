# TODO

Planned work, in phase order. See planning/plan.md (local) for full task sequences and Definitions of Done.

## Phase 1 - React UI Testing with Playwright

- Playwright with browser installation in the Makefile.
- Page object pattern with React-friendly selectors (role and test-id based).
- UI target settings (base URLs per environment) in the configuration module.
- Sample React application in docker compose; `make docker-build`, `make docker-run`, `make docker-up`, `make docker-down`.
- Allure reporting and a `make report` target.
- GitHub Actions pipeline: lint, types, tests with coverage, security audit, Docker build, Allure artifacts; consider a Windows runner to exercise the native Windows path.

## Phase 2 - REST API Testing

- Typed HTTP client over native fetch with declarative API test model.
- Zod response validation and assertion helpers.
- Sample REST API in docker compose.

## Phase 3 - MongoDB Database Testing

- MongoDB client layer with per-test data seeding and teardown.
- Document and collection assertion helpers.
- Full-stack UI to API to database scenario.
