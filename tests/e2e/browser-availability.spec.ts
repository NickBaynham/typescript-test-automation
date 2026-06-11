import { expect, test } from '@playwright/test';

const engineFor: Record<string, string> = {
  chromium: 'chromium',
  firefox: 'firefox',
  webkit: 'webkit',
  chrome: 'chromium',
  msedge: 'chromium',
};

test('every browser marked available launches its expected engine', async ({ page }, testInfo) => {
  await page.goto('about:blank');

  expect(page.url()).toBe('about:blank');
  expect(page.context().browser()?.browserType().name()).toBe(engineFor[testInfo.project.name]);
});
