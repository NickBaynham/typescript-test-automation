# Thin wrapper over package.json scripts. Every target delegates to pnpm so the
# same commands work without make (e.g. on native Windows): pnpm install, pnpm lint, ...

.PHONY: install install-browsers lint format test build run security report docker-build docker-run docker-up docker-down

install:
	pnpm install

install-browsers: build
	pnpm install:browsers

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

report:
	pnpm report

docker-build:
	pnpm docker:build

docker-run:
	pnpm docker:run

docker-up:
	pnpm docker:up

docker-down:
	pnpm docker:down
