export const STAFF = {
  BASE:   "/api/v1/staff",
  BY_ID:  (id: string | number) => `/api/v1/staff/${id}`,
  EXPORT: (format: "excel" | "csv") => `/api/v1/staff/export?format=${format}`,
} as const
