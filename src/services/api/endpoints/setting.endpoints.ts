export const SETTING = {
  BASE: "/api/v1/settings",
  BY_ID: (id: string | number) => `/api/v1/settings/${id}`,
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/settings/export?format=${format}`,
} as const;
