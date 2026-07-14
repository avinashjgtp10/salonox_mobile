export const COMMISSION_RULES = {
  BASE: "/api/v1/commission-rules",
  BY_ID: (id: string) => `/api/v1/commission-rules/${id}`,
  STATUS: (id: string) => `/api/v1/commission-rules/${id}/status`,
} as const;
