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

/**
 * The backend re-uploads a changed photo to the SAME url (avatars/<userId>.jpg),
 * so the app's disk image cache kept showing the old photo after it was changed
 * on the web. Versioning the url with the record's last update makes a new photo
 * a new url. Signed urls are left alone: an extra param would break the signature.
 */
export function withMediaVersion(url: string | null, updatedAt: unknown): string | null {
  if (!url || !/^https?:\/\//i.test(url) || /x-amz-signature/i.test(url)) return url;
  const version = typeof updatedAt === "string" || typeof updatedAt === "number" ? new Date(updatedAt).getTime() : NaN;
  if (!Number.isFinite(version) || version <= 0) return url;

  const [base, hash = ""] = url.split("#");
  const [path, query = ""] = base.split("?");
  const params = query.split("&").filter((param) => param && !param.startsWith("v="));
  return `${path}?${[...params, `v=${version}`].join("&")}${hash ? `#${hash}` : ""}`;
}
