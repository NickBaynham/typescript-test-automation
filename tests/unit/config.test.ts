import { describe, expect, test } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  test('returns defaults when no variables are set', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      environment: 'local',
      targetMode: 'docker',
      logLevel: 'info',
      ui: { baseUrl: 'http://localhost:3000' },
    });
  });

  test('reads settings from environment variables', () => {
    const config = loadConfig({
      PLATFORM_ENV: 'ci',
      TARGET_MODE: 'remote',
      LOG_LEVEL: 'debug',
      UI_BASE_URL: 'https://staging.example.com',
    });

    expect(config).toEqual({
      environment: 'ci',
      targetMode: 'remote',
      logLevel: 'debug',
      ui: { baseUrl: 'https://staging.example.com' },
    });
  });

  test('UI_BASE_URL overrides the docker default', () => {
    const config = loadConfig({ UI_BASE_URL: 'http://localhost:8080' });

    expect(config.ui.baseUrl).toBe('http://localhost:8080');
  });

  test('requires UI_BASE_URL when the target mode is remote', () => {
    expect(() => loadConfig({ TARGET_MODE: 'remote' })).toThrow(ConfigError);
    expect(() => loadConfig({ TARGET_MODE: 'remote' })).toThrow('UI_BASE_URL');
  });

  test('rejects a malformed UI_BASE_URL', () => {
    expect(() => loadConfig({ UI_BASE_URL: 'not-a-url' })).toThrow(ConfigError);
    expect(() => loadConfig({ UI_BASE_URL: 'not-a-url' })).toThrow('UI_BASE_URL');
  });

  test.each([
    ['PLATFORM_ENV', { PLATFORM_ENV: 'staging' }],
    ['TARGET_MODE', { TARGET_MODE: 'kubernetes' }],
    ['LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
  ])('throws ConfigError naming %s when its value is invalid', (variable, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(variable);
  });

  test('ConfigError carries its class name for structured logs', () => {
    try {
      loadConfig({ PLATFORM_ENV: 'staging' });
      expect.unreachable('loadConfig should have thrown');
    } catch (error) {
      expect((error as Error).name).toBe('ConfigError');
    }
  });

  test('ignores unrelated environment variables', () => {
    const config = loadConfig({ PATH: '/usr/bin', HOME: '/home/user' });

    expect(config.environment).toBe('local');
  });
});
