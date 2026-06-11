import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import {
  availableBrowsers,
  browsersFilePath,
  BrowsersFileError,
  parseBrowsersFile,
  type BrowserEntry,
} from './src/browsers.js';
import { loadConfig } from './src/config.js';

const projectFor = (browser: BrowserEntry) => {
  switch (browser.name) {
    case 'chromium':
      return { name: browser.name, use: { ...devices['Desktop Chrome'] } };
    case 'firefox':
      return { name: browser.name, use: { ...devices['Desktop Firefox'] } };
    case 'webkit':
      return { name: browser.name, use: { ...devices['Desktop Safari'] } };
    case 'chrome':
      return { name: browser.name, use: { ...devices['Desktop Chrome'], channel: browser.name } };
    case 'msedge':
      return { name: browser.name, use: { ...devices['Desktop Edge'], channel: browser.name } };
  }
};

const loadProjects = () => {
  let content: string;
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- module constant anchored to the project root, not user input
    content = readFileSync(browsersFilePath, 'utf8');
  } catch {
    throw new BrowsersFileError(
      'config/browsers.json not found; run make install-browsers ' +
        '(or: pnpm build && pnpm install:browsers) first',
    );
  }
  return availableBrowsers(parseBrowsersFile(content)).map(projectFor);
};

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['list'], ['allure-playwright', { resultsDir: 'allure-results' }]],
  use: {
    baseURL: loadConfig().ui.baseUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: loadProjects(),
});
