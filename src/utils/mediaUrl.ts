/** Native image loaders require absolute URLs for server-hosted media. */
export function resolveMediaUrl(value: string | null | undefined, apiBaseUrl: string): string | null {
  const uri = value?.trim();
  if (!uri) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(uri)) return uri;
  try {
    return new URL(uri, `${apiBaseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return null;
  }
}
