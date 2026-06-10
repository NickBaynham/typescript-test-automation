import { z } from 'zod';

/** Raised when environment variables fail validation. */
export class ConfigError extends Error {}

const envSchema = z.object({
  PLATFORM_ENV: z.enum(['local', 'ci', 'remote']).default('local'),
  TARGET_MODE: z.enum(['docker', 'remote']).default('docker'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/** Platform settings resolved from environment variables. */
export interface PlatformConfig {
  readonly environment: 'local' | 'ci' | 'remote';
  readonly targetMode: 'docker' | 'remote';
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
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
  return {
    environment: parsed.data.PLATFORM_ENV,
    targetMode: parsed.data.TARGET_MODE,
    logLevel: parsed.data.LOG_LEVEL,
  };
}
