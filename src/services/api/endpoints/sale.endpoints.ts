export const SALE = {
  BASE: "/api/v1/sales",
  INIT: "/api/v1/sales/init",
  BY_ID: (id: string | number) => `/api/v1/sales/${id}`,
  CHECKOUT: (id: string | number) => `/api/v1/sales/${id}/checkout`,
  SUMMARY: "/api/v1/sales/summary",
  EXPORT: (params: { format: "excel" | "csv" | "pdf"; date?: string }) => {
    const q = new URLSearchParams({ format: params.format });
    if (params.date) q.set("date", params.date);
    return `/api/v1/sales/export?${q.toString()}`;
  },
} as const;
