export const CATALOG = {
  BASE: "/api/v1/catalog",
  BY_ID: (id: string | number) => `/api/v1/catalog/${id}`,
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/catalog/export?format=${format}`,
} as const;
