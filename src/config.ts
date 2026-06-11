import { z } from 'zod';

/** Raised when environment variables fail validation. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

const envSchema = z.object({
  PLATFORM_ENV: z.enum(['local', 'ci', 'remote']).default('local'),
  TARGET_MODE: z.enum(['docker', 'remote']).default('docker'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  UI_BASE_URL: z.url().optional(),
});

const dockerUiBaseUrl = 'http://localhost:3000';

/** Platform settings resolved from environment variables. */
export interface PlatformConfig {
  readonly environment: 'local' | 'ci' | 'remote';
  readonly targetMode: 'docker' | 'remote';
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly ui: { readonly baseUrl: string };
}

/** Parses platform configuration from environment variables, applying defaults. */
export function loadConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PlatformConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`Invalid environment configuration: ${issues}`);
  }
  const { PLATFORM_ENV, TARGET_MODE, LOG_LEVEL, UI_BASE_URL } = parsed.data;
  if (TARGET_MODE === 'remote' && UI_BASE_URL === undefined) {
    throw new ConfigError(
      'Invalid environment configuration: UI_BASE_URL is required when TARGET_MODE is remote',
    );
  }
  return {
    environment: PLATFORM_ENV,
    targetMode: TARGET_MODE,
    logLevel: LOG_LEVEL,
    ui: { baseUrl: UI_BASE_URL ?? dockerUiBaseUrl },
  };
}
