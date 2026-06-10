# Thin wrapper over package.json scripts. Every target delegates to pnpm so the
# same commands work without make (e.g. on native Windows): pnpm install, pnpm lint, ...

.PHONY: install lint format test build run security

install:
	pnpm install

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test

build:
	pnpm build

run: build
	pnpm start

security:
	pnpm security
