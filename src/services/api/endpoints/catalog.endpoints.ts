export const CATALOG = {
  BASE: "/api/v1/products",
  BY_ID: (id: string | number) => `/api/v1/products/${id}`,
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/products/export?format=${format}`,
} as const;
