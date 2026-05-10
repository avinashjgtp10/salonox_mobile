const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "";

export const API_ORIGIN = rawApiBaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "")
  .replace(/\/api$/, "");

export const API_V1_BASE_URL = `${API_ORIGIN}/api/v1`;
