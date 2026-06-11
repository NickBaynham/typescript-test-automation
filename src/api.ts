import { z } from 'zod';
import { joinUrl } from './urls.js';

/** Raised for client-level API failures, e.g. a non-JSON body. */
export class ApiError extends Error {
  override name = 'ApiError';
}

const methodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/** HTTP method accepted by the client. */
export type Method = z.infer<typeof methodSchema>;

const apiCallSchema = z.object({
  method: methodSchema.default('GET'),
  path: z.string().min(1),
  params: z.record(z.string(), z.string()).default({}),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.unknown().optional(),
});

/** A declarative REST call, dispatched by ApiClient.send. */
export type ApiCall = z.input<typeof apiCallSchema>;

/** Response wrapper: body text is read eagerly, JSON parsed on demand. */
export interface ApiResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly text: string;
  json(): unknown;
}

/** Per-request options; headers override the client defaults. */
export interface RequestOptions {
  readonly params?: Record<string, string>;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

/** Injection seam for tests; production use defaults to global fetch. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

interface ClientOptions {
  readonly headers?: Record<string, string>;
  readonly bearerToken?: string;
  readonly timeoutMs?: number;
  readonly fetchFn?: FetchLike;
}

/** HTTP client bound to a base URL, with default headers and bearer auth. */
export class ApiClient {
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchLike;

  constructor(
    private readonly baseUrl: string,
    options: ClientOptions = {},
  ) {
    this.defaultHeaders = { ...options.headers };
    if (options.bearerToken !== undefined) {
      this.defaultHeaders.Authorization = `Bearer ${options.bearerToken}`;
    }
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchFn = options.fetchFn ?? ((url, init) => fetch(url, init));
  }

  /** Sends one request; see RequestOptions for per-request overrides. */
  async request(method: Method, path: string, options: RequestOptions = {}): Promise<ApiResponse> {
    const url = new URL(joinUrl(this.baseUrl, path));
    for (const [name, value] of Object.entries(options.params ?? {})) {
      url.searchParams.set(name, value);
    }
    const headers = new Headers({ ...this.defaultHeaders, ...options.headers });
    const init: RequestInit = { method, headers, signal: AbortSignal.timeout(this.timeoutMs) };
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.body);
    }
    const response = await this.fetchFn(url.toString(), init);
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      json: (): unknown => {
        try {
          return JSON.parse(text);
        } catch {
          throw new ApiError(`response body is not JSON: ${text.slice(0, 200)}`);
        }
      },
    };
  }

  get(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.request('GET', path, options);
  }

  post(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.request('POST', path, options);
  }

  put(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.request('PUT', path, options);
  }

  delete(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.request('DELETE', path, options);
  }

  /** Dispatches a declarative call, validating it and applying defaults. */
  send(call: ApiCall): Promise<ApiResponse> {
    const result = apiCallSchema.safeParse(call);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return Promise.reject(new ApiError(`invalid ApiCall: ${details}`));
    }
    const parsed = result.data;
    const options: RequestOptions = {
      params: parsed.params,
      headers: parsed.headers,
      ...(parsed.body === undefined ? {} : { body: parsed.body }),
    };
    return this.request(parsed.method, parsed.path, options);
  }
}
