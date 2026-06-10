import { describe, expect, test } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  test('returns defaults when no variables are set', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      environment: 'local',
      targetMode: 'docker',
      logLevel: 'info',
    });
  });

  test('reads settings from environment variables', () => {
    const config = loadConfig({
      PLATFORM_ENV: 'ci',
      TARGET_MODE: 'remote',
      LOG_LEVEL: 'debug',
    });

    expect(config).toEqual({
      environment: 'ci',
      targetMode: 'remote',
      logLevel: 'debug',
    });
  });

  test.each([
    ['PLATFORM_ENV', { PLATFORM_ENV: 'staging' }],
    ['TARGET_MODE', { TARGET_MODE: 'kubernetes' }],
    ['LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
  ])('throws ConfigError naming %s when its value is invalid', (variable, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(variable);
  });

  test('ignores unrelated environment variables', () => {
    const config = loadConfig({ PATH: '/usr/bin', HOME: '/home/user' });

    expect(config.environment).toBe('local');
  });
});
