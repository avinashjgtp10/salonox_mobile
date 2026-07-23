export const EWALLET = {
  TOPUP:     (clientId: string | number) => `/api/v1/ewallet/${clientId}/topup`,
  ADJUST:    (clientId: string | number) => `/api/v1/ewallet/${clientId}/adjust`,
  BALANCE:   (clientId: string | number) => `/api/v1/ewallet/${clientId}/balance`,
  LEDGER:    (clientId: string | number) => `/api/v1/ewallet/${clientId}/ledger`,
  BREAKDOWN: (clientId: string | number) => `/api/v1/ewallet/${clientId}/breakdown`,
} as const;
