import { defineConfig } from 'vitest/config';

/**
 * Integration suite: runs against the dockerized sample API (make docker-up)
 * or a remote target. No coverage gate here; coverage is measured by the
 * unit suite, which exercises the platform code directly.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    // One file at a time: integration files share live server state.
    fileParallelism: false,
  },
});
