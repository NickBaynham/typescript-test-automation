import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Playwright-managed browser engines, installed on demand. */
export type EngineName = 'chromium' | 'firefox' | 'webkit';

/** Browsers driven via a host-installed branded browser (Playwright channel). */
export type ChannelName = 'chrome' | 'msedge';

export const engineNames: readonly EngineName[] = ['chromium', 'firefox', 'webkit'];
export const channelNames: readonly ChannelName[] = ['chrome', 'msedge'];

/** Raised when the browser availability file is missing, malformed, or empty. */
export class BrowsersFileError extends Error {
  override name = 'BrowsersFileError';
}

const browserEntrySchema = z.object({
  name: z.enum([...engineNames, ...channelNames]),
  kind: z.enum(['engine', 'channel']),
  available: z.boolean(),
});

const browsersFileSchema = z.object({
  browsers: z.array(browserEntrySchema),
});

/** One detected browser and whether it can be used on this host. */
export type BrowserEntry = z.infer<typeof browserEntrySchema>;

/** Contents of config/browsers.json. */
export type BrowsersFile = z.infer<typeof browsersFileSchema>;

/** Assembles the availability file from detection results. */
export function buildBrowsersFile(
  engines: Readonly<Record<EngineName, boolean>>,
  channels: Readonly<Record<ChannelName, boolean>>,
): BrowsersFile {
  return {
    browsers: [
      { name: 'chromium', kind: 'engine', available: engines.chromium },
      { name: 'firefox', kind: 'engine', available: engines.firefox },
      { name: 'webkit', kind: 'engine', available: engines.webkit },
      { name: 'chrome', kind: 'channel', available: channels.chrome },
      { name: 'msedge', kind: 'channel', available: channels.msedge },
    ],
  };
}

const regenerateHint =
  'regenerate with make install-browsers (or: pnpm build && pnpm install:browsers)';

/** Parses and validates browsers.json content. */
export function parseBrowsersFile(content: string): BrowsersFile {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new BrowsersFileError(`browsers file is not valid JSON; ${regenerateHint}`);
  }
  const parsed = browsersFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new BrowsersFileError(`browsers file is malformed: ${issues}; ${regenerateHint}`);
  }
  return parsed.data;
}

/** Returns the browsers usable on this host; throws if there are none. */
export function availableBrowsers(file: BrowsersFile): BrowserEntry[] {
  const usable = file.browsers.filter((browser) => browser.available);
  if (usable.length === 0) {
    throw new BrowsersFileError(
      'no browsers are available on this host; run make install-browsers ' +
        '(or: pnpm build && pnpm install:browsers) and check its output',
    );
  }
  return usable;
}

/** Absolute path to the generated availability file, anchored to the project root. */
export const browsersFilePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'config',
  'browsers.json',
);

type Env = Readonly<Record<string, string | undefined>>;

function channelCandidates(
  platform: string,
  env: Env,
): Record<ChannelName, readonly string[]> | undefined {
  switch (platform) {
    case 'darwin':
      return {
        chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
        msedge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      };
    case 'linux':
      return {
        chrome: [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/opt/google/chrome/chrome',
        ],
        msedge: [
          '/usr/bin/microsoft-edge',
          '/usr/bin/microsoft-edge-stable',
          '/opt/microsoft/msedge/msedge',
        ],
      };
    case 'win32': {
      const userLevel = (suffix: string) =>
        env.LOCALAPPDATA === undefined ? [] : [`${env.LOCALAPPDATA}\\${suffix}`];
      return {
        chrome: [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ...userLevel('Google\\Chrome\\Application\\chrome.exe'),
        ],
        msedge: [
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          ...userLevel('Microsoft\\Edge\\Application\\msedge.exe'),
        ],
      };
    }
    default:
      return undefined;
  }
}

/** Detects which branded host browsers exist at their known per-platform paths. */
export function detectChannels(
  platform: string,
  exists: (path: string) => boolean,
  env: Env = process.env,
): Record<ChannelName, boolean> {
  const candidates = channelCandidates(platform, env);
  return {
    chrome: candidates?.chrome.some(exists) ?? false,
    msedge: candidates?.msedge.some(exists) ?? false,
  };
}
