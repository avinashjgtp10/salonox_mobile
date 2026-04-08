export const BOOKING = {
  BASE: "/api/v1/bookings",
  BY_ID: (id: string | number) => `/api/v1/bookings/${id}`,
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/bookings/export?format=${format}`,
} as const;
