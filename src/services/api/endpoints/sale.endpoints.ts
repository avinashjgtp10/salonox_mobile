export const SALE = {
  BASE: "/api/v1/sales",
  BY_ID: (id: string | number) => `/api/v1/sales/${id}`,
  EXPORT: (format: "excel" | "csv") => `/api/v1/sales/export?format=${format}`,
} as const;
