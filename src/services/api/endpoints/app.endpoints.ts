export const APP = {
  BASE: "/api/v1/apps",
  BY_ID: (id: string | number) => `/api/v1/apps/${id}`,
  EXPORT: (format: "excel" | "csv") => `/api/v1/apps/export?format=${format}`,
} as const;
