import { z } from 'zod';

/** Raised when environment variables fail validation. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

const envSchema = z.object({
  PLATFORM_ENV: z.string().min(1).default('local'),
  TARGET_MODE: z.enum(['docker', 'remote']).default('docker'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  UI_BASE_URL: z.url().optional(),
  API_BASE_URL: z.url().optional(),
  MONGO_URL: z.url({ protocol: /^mongodb(\+srv)?$/ }).optional(),
  MONGO_DATABASE: z.string().min(1).default('sampledb'),
});

const dockerDefaults = {
  UI_BASE_URL: 'http://localhost:3100',
  API_BASE_URL: 'http://localhost:8100',
  MONGO_URL: 'mongodb://localhost:27100',
};

/** Platform settings resolved from environment variables. */
export interface PlatformConfig {
  /** Free-form environment label (local, ci, staging-eu, ...); informational. */
  readonly environment: string;
  readonly targetMode: 'docker' | 'remote';
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly ui: { readonly baseUrl: string };
  readonly api: { readonly baseUrl: string };
  readonly mongo: { readonly url: string; readonly database: string };
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
  const { PLATFORM_ENV, TARGET_MODE, LOG_LEVEL } = parsed.data;
  if (TARGET_MODE === 'remote') {
    // The central list of target URLs that must be explicit in remote mode so
    // localhost defaults never leak into a remote run. Phase 3 adds MONGO_URL.
    const remoteRequired = new Map<string, string | undefined>([
      ['UI_BASE_URL', parsed.data.UI_BASE_URL],
      ['API_BASE_URL', parsed.data.API_BASE_URL],
      ['MONGO_URL', parsed.data.MONGO_URL],
    ]);
    const missing = [...remoteRequired]
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new ConfigError(
        `remote target mode requires explicit values for: ${missing.join(', ')}`,
      );
    }
  }
  return {
    environment: PLATFORM_ENV,
    targetMode: TARGET_MODE,
    logLevel: LOG_LEVEL,
    ui: { baseUrl: parsed.data.UI_BASE_URL ?? dockerDefaults.UI_BASE_URL },
    api: { baseUrl: parsed.data.API_BASE_URL ?? dockerDefaults.API_BASE_URL },
    mongo: {
      url: parsed.data.MONGO_URL ?? dockerDefaults.MONGO_URL,
      database: parsed.data.MONGO_DATABASE,
    },
  };
}
