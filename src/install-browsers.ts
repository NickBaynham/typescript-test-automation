import { dirname } from 'node:path';
import {
  browsersFilePath,
  buildBrowsersFile,
  detectChannels,
  type BrowsersFile,
  type EngineName,
} from './browsers.js';
import type { Logger } from './logger.js';

/** Outcome of spawning a playwright install command. */
export interface SpawnResult {
  status: number | null;
  error?: Error | undefined;
}

/** Host integration points, injected so the orchestration is testable. */
export interface InstallerDeps {
  installEngine: (engine: EngineName) => SpawnResult;
  exists: (path: string) => boolean;
  mkdir: (path: string) => void;
  writeFile: (path: string, content: string) => void;
  platform: string;
  env: Readonly<Record<string, string | undefined>>;
  logger: Logger;
}

/**
 * Installs each supported Playwright engine, detects branded host browsers,
 * and records the results in the availability file.
 */
export function installBrowsers(deps: InstallerDeps): BrowsersFile {
  const available = (engine: EngineName): boolean => {
    const result = deps.installEngine(engine);
    if (result.error) {
      deps.logger.error('browser install could not run', {
        engine,
        cause: result.error.message,
      });
      return false;
    }
    return result.status === 0;
  };

  const file = buildBrowsersFile(
    {
      chromium: available('chromium'),
      firefox: available('firefox'),
      webkit: available('webkit'),
    },
    detectChannels(deps.platform, deps.exists, deps.env),
  );

  deps.mkdir(dirname(browsersFilePath));
  deps.writeFile(browsersFilePath, `${JSON.stringify(file, null, 2)}\n`);

  for (const browser of file.browsers) {
    deps.logger.info('browser detected', {
      name: browser.name,
      kind: browser.kind,
      available: browser.available,
    });
  }
  return file;
}
