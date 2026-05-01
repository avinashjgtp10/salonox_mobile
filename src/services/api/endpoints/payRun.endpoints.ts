export const PAY_RUNS = {
  BASE: "/api/v1/pay-runs",
  BY_ID: (id: string | number) => `/api/v1/pay-runs/${id}`,
  SUMMARY: "/api/v1/pay-runs/summary",
  ADJUSTMENT: (id: string | number) => `/api/v1/pay-runs/${id}/adjustment`,
} as const;
