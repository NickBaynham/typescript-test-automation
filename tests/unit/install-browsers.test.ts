import { dirname } from 'node:path';
import { describe, expect, test } from 'vitest';
import { browsersFilePath, type EngineName } from '../../src/browsers.js';
import { installBrowsers, type InstallerDeps } from '../../src/install-browsers.js';
import { createLogger } from '../../src/logger.js';

interface Harness {
  deps: InstallerDeps;
  writes: { path: string; content: string }[];
  mkdirs: string[];
  logs: { level: string; message: string }[];
}

const harness = (overrides: Partial<InstallerDeps> = {}): Harness => {
  const writes: Harness['writes'] = [];
  const mkdirs: string[] = [];
  const lines: string[] = [];
  const deps: InstallerDeps = {
    installEngine: () => ({ status: 0 }),
    exists: () => false,
    mkdir: (path) => void mkdirs.push(path),
    writeFile: (path, content) => void writes.push({ path, content }),
    platform: 'linux',
    env: {},
    logger: createLogger('debug', (line) => void lines.push(line)),
    ...overrides,
  };
  return {
    deps,
    writes,
    mkdirs,
    get logs() {
      return lines.map((line) => JSON.parse(line) as { level: string; message: string });
    },
  };
};

describe('installBrowsers', () => {
  test('marks each engine available exactly when its install exits 0', () => {
    const { deps } = harness({
      installEngine: (engine: EngineName) => ({ status: engine === 'firefox' ? 1 : 0 }),
    });

    const file = installBrowsers(deps);

    expect(file.browsers).toContainEqual({ name: 'chromium', kind: 'engine', available: true });
    expect(file.browsers).toContainEqual({ name: 'firefox', kind: 'engine', available: false });
    expect(file.browsers).toContainEqual({ name: 'webkit', kind: 'engine', available: true });
  });

  test('logs the cause and marks the engine unavailable when the spawn itself fails', () => {
    const h = harness({
      installEngine: () => ({ status: null, error: new Error('spawn pnpm ENOENT') }),
    });

    const file = installBrowsers(h.deps);

    expect(file.browsers.filter((browser) => browser.kind === 'engine')).toEqual([
      { name: 'chromium', kind: 'engine', available: false },
      { name: 'firefox', kind: 'engine', available: false },
      { name: 'webkit', kind: 'engine', available: false },
    ]);
    const errors = h.logs.filter((log) => log.level === 'error');
    expect(errors).toHaveLength(3);
    expect(JSON.stringify(errors[0])).toContain('spawn pnpm ENOENT');
  });

  test('detects channels for the given platform and environment', () => {
    const { deps } = harness({
      platform: 'darwin',
      exists: (path) => path.includes('Google Chrome'),
    });

    const file = installBrowsers(deps);

    expect(file.browsers).toContainEqual({ name: 'chrome', kind: 'channel', available: true });
    expect(file.browsers).toContainEqual({ name: 'msedge', kind: 'channel', available: false });
  });

  test('writes the availability file to the project-root-anchored path', () => {
    const h = harness();

    const file = installBrowsers(h.deps);

    expect(h.mkdirs).toEqual([dirname(browsersFilePath)]);
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0]?.path).toBe(browsersFilePath);
    expect(h.writes[0]?.content.endsWith('\n')).toBe(true);
    expect(JSON.parse(h.writes[0]?.content ?? '')).toEqual(file);
  });

  test('logs one summary line per browser', () => {
    const h = harness();

    installBrowsers(h.deps);

    expect(h.logs.filter((log) => log.message === 'browser detected')).toHaveLength(5);
  });
});
