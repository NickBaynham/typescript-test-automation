/**
 * Joins a base URL and an absolute-style path, preserving any path prefix in
 * the base (https://host/v1 + /items = https://host/v1/items). Plain WHATWG
 * URL resolution would silently drop the prefix.
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), base).toString();
}

/** Strips credentials from a URL so it is safe to include in logs and errors. */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return '<unparseable url>';
  }
}
