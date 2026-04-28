const BASE = "/api/v1/blocked-times";

export const BLOCKED_TIME = {
  BASE,
  BY_ID: (id: string | number) => `${BASE}/${id}`,
  QUERY: (params: { date?: string; staffId?: string; salonId?: string }) => {
    const p = new URLSearchParams();
    if (params.date) p.set("date", params.date);
    if (params.staffId) p.set("staff_id", params.staffId);
    if (params.salonId) p.set("salon_id", params.salonId);
    return `${BASE}?${p.toString()}`;
  },
};
