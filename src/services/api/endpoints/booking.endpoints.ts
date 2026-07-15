export const BOOKING = {
  BASE: "/api/v1/appointments",
  BY_ID: (id: string | number) => `/api/v1/appointments/${id}`,

  // ── Status transitions ─────────────────────────────────────────────────────
  CANCEL:   (id: string | number) => `/api/v1/appointments/${id}/cancel`,
  CHECKOUT: (id: string | number) => `/api/v1/appointments/${id}/checkout`,

  EXPORT: (
    format: "excel" | "csv" | "pdf",
    filters?: { salon_id?: string; status?: string; start_date?: string; end_date?: string }
  ) => {
    const params = new URLSearchParams({ format });
    if (filters?.salon_id)   params.set("salon_id",   filters.salon_id);
    if (filters?.status)     params.set("status",     filters.status);
    if (filters?.start_date) params.set("start_date", filters.start_date);
    if (filters?.end_date)   params.set("end_date",   filters.end_date);
    return `/api/v1/appointments/export?${params.toString()}`;
  },
} as const;
