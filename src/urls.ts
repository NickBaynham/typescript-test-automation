/**
 * Joins a base URL and an absolute-style path, preserving any path prefix in
 * the base (https://host/v1 + /items = https://host/v1/items). Plain WHATWG
 * URL resolution would silently drop the prefix.
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), base).toString();
}
