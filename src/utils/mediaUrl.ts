import { API_ORIGIN } from "../services/api/baseUrl";

export function resolveMediaUrl(url?: string | null) {
  const value = url?.trim();
  if (!value) return "";
  if (value.startsWith("blob:") || value.startsWith("data:")) return value;

  try {
    const parsed = new URL(value);
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return value;
  } catch {
    // Relative path, handled below.
  }

  if (value.startsWith("/")) return value;
  if (value.startsWith("uploads/")) return `/${value}`;
  if (API_ORIGIN) return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
  return `/${value.replace(/^\/+/, "")}`;
}
