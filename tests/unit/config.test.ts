import { describe, expect, test } from 'vitest';
import { ConfigError, loadConfig, type PlatformConfig } from '../../src/config.js';

describe('loadConfig', () => {
  test('returns defaults when no variables are set', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      environment: 'local',
      targetMode: 'docker',
      logLevel: 'info',
      ui: { baseUrl: 'http://localhost:3100' },
      api: { baseUrl: 'http://localhost:8100' },
      mongo: { url: 'mongodb://localhost:27100', database: 'sampledb' },
    });
  });

  test('reads Mongo settings from environment variables', () => {
    const config = loadConfig({
      MONGO_URL: 'mongodb://db.example.com:27017',
      MONGO_DATABASE: 'proddb',
    });

    expect(config.mongo).toEqual({ url: 'mongodb://db.example.com:27017', database: 'proddb' });
  });

  test('accepts a mongodb+srv MONGO_URL', () => {
    const config = loadConfig({ MONGO_URL: 'mongodb+srv://cluster.example.mongodb.net/db' });

    expect(config.mongo.url).toContain('mongodb+srv://');
  });

  test('rejects an empty MONGO_DATABASE', () => {
    expect(() => loadConfig({ MONGO_DATABASE: '' })).toThrow(ConfigError);
    expect(() => loadConfig({ MONGO_DATABASE: '' })).toThrow('MONGO_DATABASE');
  });

  test('reads settings from environment variables', () => {
    const config = loadConfig({
      PLATFORM_ENV: 'staging-eu',
      TARGET_MODE: 'remote',
      LOG_LEVEL: 'debug',
      UI_BASE_URL: 'https://staging.example.com',
      API_BASE_URL: 'https://api.staging.example.com',
      MONGO_URL: 'mongodb://db.staging.example.com:27017',
      MONGO_DATABASE: 'stagingdb',
    });

    expect(config).toEqual({
      environment: 'staging-eu',
      targetMode: 'remote',
      logLevel: 'debug',
      ui: { baseUrl: 'https://staging.example.com' },
      api: { baseUrl: 'https://api.staging.example.com' },
      mongo: { url: 'mongodb://db.staging.example.com:27017', database: 'stagingdb' },
    });
  });

  test('PLATFORM_ENV is a free-form label but must not be empty', () => {
    expect(loadConfig({ PLATFORM_ENV: 'my-perf-rig' }).environment).toBe('my-perf-rig');
    expect(() => loadConfig({ PLATFORM_ENV: '' })).toThrow(ConfigError);
  });

  test.each([
    [
      'UI_BASE_URL',
      { UI_BASE_URL: 'http://localhost:9999' },
      (config: PlatformConfig) => config.ui.baseUrl,
    ],
    [
      'API_BASE_URL',
      { API_BASE_URL: 'http://localhost:9999' },
      (config: PlatformConfig) => config.api.baseUrl,
    ],
  ])('%s overrides the docker default', (_name, env, read) => {
    expect(read(loadConfig(env))).toBe('http://localhost:9999');
  });

  test('remote target mode requires every target URL explicitly', () => {
    expect(() => loadConfig({ TARGET_MODE: 'remote' })).toThrow(ConfigError);
    expect(() => loadConfig({ TARGET_MODE: 'remote' })).toThrow(
      /UI_BASE_URL.*API_BASE_URL.*MONGO_URL/,
    );
  });

  test('remote target mode names only the missing URLs', () => {
    const env = { TARGET_MODE: 'remote', UI_BASE_URL: 'https://app.example.com' };

    expect(() => loadConfig(env)).toThrow('API_BASE_URL');
    expect(() => loadConfig(env)).not.toThrow(/UI_BASE_URL/);
  });

  test('remote target mode passes when every target URL is set', () => {
    const config = loadConfig({
      TARGET_MODE: 'remote',
      UI_BASE_URL: 'https://app.example.com',
      API_BASE_URL: 'https://api.example.com',
      MONGO_URL: 'mongodb://db.example.com:27017',
    });

    expect(config.targetMode).toBe('remote');
  });

  test.each([
    ['UI_BASE_URL', { UI_BASE_URL: 'not-a-url' }],
    ['API_BASE_URL', { API_BASE_URL: 'also not a url' }],
  ])('rejects a malformed %s', (variable, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(variable);
  });

  test.each([
    ['TARGET_MODE', { TARGET_MODE: 'kubernetes' }],
    ['LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
  ])('throws ConfigError naming %s when its value is invalid', (variable, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(variable);
  });

  test('ConfigError carries its class name for structured logs', () => {
    try {
      loadConfig({ TARGET_MODE: 'bogus' });
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
