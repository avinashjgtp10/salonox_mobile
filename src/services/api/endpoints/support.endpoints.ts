export const SUPPORT = {
  SUBMIT:       "/api/v1/support",
  MY_TICKETS:   "/api/v1/support/my",
  ALL_TICKETS:  "/api/v1/support",
  STATS:        "/api/v1/support/stats",
  REPLY:        (id: string) => `/api/v1/support/${id}/reply`,
  STATUS:       (id: string) => `/api/v1/support/${id}/status`,
} as const;
