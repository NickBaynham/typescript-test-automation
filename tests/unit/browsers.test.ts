import { isAbsolute, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  availableBrowsers,
  browsersFilePath,
  BrowsersFileError,
  buildBrowsersFile,
  detectChannels,
  parseBrowsersFile,
} from '../../src/browsers.js';

const existsIn = (present: string[]) => (path: string) => present.includes(path);

describe('detectChannels', () => {
  test('finds chrome on macOS at its application bundle path', () => {
    const exists = existsIn(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']);

    expect(detectChannels('darwin', exists)).toEqual({ chrome: true, msedge: false });
  });

  test('finds msedge on linux at any known candidate path', () => {
    const exists = existsIn(['/opt/microsoft/msedge/msedge']);

    expect(detectChannels('linux', exists)).toEqual({ chrome: false, msedge: true });
  });

  test('finds both browsers on windows under Program Files', () => {
    const exists = existsIn([
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ]);

    expect(detectChannels('win32', exists)).toEqual({ chrome: true, msedge: true });
  });

  test('reports no channels on an unsupported platform', () => {
    expect(detectChannels('aix', () => true)).toEqual({ chrome: false, msedge: false });
  });

  test('finds per-user windows installs under LOCALAPPDATA', () => {
    const exists = existsIn([
      'D:\\Users\\dev\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      'D:\\Users\\dev\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe',
    ]);
    const env = { LOCALAPPDATA: 'D:\\Users\\dev\\AppData\\Local' };

    expect(detectChannels('win32', exists, env)).toEqual({ chrome: true, msedge: true });
  });

  test('ignores LOCALAPPDATA candidates when the variable is unset', () => {
    expect(detectChannels('win32', () => false, {})).toEqual({ chrome: false, msedge: false });
  });
});

describe('browsersFilePath', () => {
  test('is an absolute path to config/browsers.json at the project root', () => {
    expect(isAbsolute(browsersFilePath)).toBe(true);
    expect(browsersFilePath.endsWith(join('config', 'browsers.json'))).toBe(true);
    expect(browsersFilePath.includes(join('src', 'config'))).toBe(false);
    expect(browsersFilePath.includes(join('dist', 'config'))).toBe(false);
  });
});

describe('browsers file', () => {
  const file = buildBrowsersFile(
    { chromium: true, firefox: true, webkit: false },
    { chrome: true, msedge: false },
  );

  test('buildBrowsersFile records every engine and channel with its availability', () => {
    expect(file).toEqual({
      browsers: [
        { name: 'chromium', kind: 'engine', available: true },
        { name: 'firefox', kind: 'engine', available: true },
        { name: 'webkit', kind: 'engine', available: false },
        { name: 'chrome', kind: 'channel', available: true },
        { name: 'msedge', kind: 'channel', available: false },
      ],
    });
  });

  test('parseBrowsersFile round-trips JSON produced by buildBrowsersFile', () => {
    expect(parseBrowsersFile(JSON.stringify(file))).toEqual(file);
  });

  test.each([
    ['not JSON at all', 'nonsense'],
    ['wrong shape', '{"browsers": "yes"}'],
    ['unknown browser name', '{"browsers":[{"name":"opera","kind":"engine","available":true}]}'],
  ])('parseBrowsersFile rejects %s with BrowsersFileError', (_case, content) => {
    expect(() => parseBrowsersFile(content)).toThrow(BrowsersFileError);
  });

  test('BrowsersFileError carries its class name for structured logs', () => {
    try {
      parseBrowsersFile('nonsense');
      expect.unreachable('parseBrowsersFile should have thrown');
    } catch (error) {
      expect((error as Error).name).toBe('BrowsersFileError');
    }
  });

  test('parseBrowsersFile reports every validation issue with its path', () => {
    const content = '{"browsers":[{"name":"opera","kind":"bad","available":1}]}';

    expect(() => parseBrowsersFile(content)).toThrow(/browsers\.0\.name/);
    expect(() => parseBrowsersFile(content)).toThrow(/browsers\.0\.kind/);
    expect(() => parseBrowsersFile(content)).toThrow(/browsers\.0\.available/);
  });

  test('availableBrowsers names both the make and pnpm commands when none are available', () => {
    const empty = buildBrowsersFile(
      { chromium: false, firefox: false, webkit: false },
      { chrome: false, msedge: false },
    );

    expect(() => availableBrowsers(empty)).toThrow('make install-browsers');
    expect(() => availableBrowsers(empty)).toThrow('pnpm install:browsers');
  });

  test('availableBrowsers returns only entries marked available', () => {
    expect(availableBrowsers(file).map((browser) => browser.name)).toEqual([
      'chromium',
      'firefox',
      'chrome',
    ]);
  });

  test('availableBrowsers throws when no browser is available', () => {
    const empty = buildBrowsersFile(
      { chromium: false, firefox: false, webkit: false },
      { chrome: false, msedge: false },
    );

    expect(() => availableBrowsers(empty)).toThrow(BrowsersFileError);
    expect(() => availableBrowsers(empty)).toThrow('no browsers are available');
  });
});
