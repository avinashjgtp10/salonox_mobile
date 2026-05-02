export const CALENDAR = {
  BASE: "/api/v1/calendar",
  BY_ID: (id: string | number) => `/api/v1/calendar/${id}`,
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/calendar/export?format=${format}`,

  // ── Status transitions ─────────────────────────────────────────────────────
  CONFIRM:  (id: string | number) => `/api/v1/calendar/${id}/confirm`,
  START:    (id: string | number) => `/api/v1/calendar/${id}/start`,
  CANCEL:   (id: string | number) => `/api/v1/calendar/${id}/cancel`,
  NO_SHOW:  (id: string | number) => `/api/v1/calendar/${id}/no-show`,
  CHECKOUT: (id: string | number) => `/api/v1/calendar/${id}/checkout`,
} as const;
