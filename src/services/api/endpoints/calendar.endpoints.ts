export const CALENDAR = {
  BASE:   "/api/v1/calendar",
  BY_ID:  (id: string | number) => `/api/v1/calendar/${id}`,
  EXPORT: (format: "excel" | "csv") => `/api/v1/calendar/export?format=${format}`,
} as const;
