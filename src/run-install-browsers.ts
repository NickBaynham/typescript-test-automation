/** Entry point wiring real host integrations into installBrowsers. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { installBrowsers } from './install-browsers.js';
import { createLogger } from './logger.js';

installBrowsers({
  installEngine: (engine) => {
    const result = spawnSync('pnpm', ['exec', 'playwright', 'install', engine], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    return { status: result.status, error: result.error };
  },
  exists: existsSync,
  mkdir: (path) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- always dirname(browsersFilePath), a module constant
    mkdirSync(path, { recursive: true });
  },
  writeFile: writeFileSync,
  platform: process.platform,
  env: process.env,
  logger: createLogger('info'),
});
