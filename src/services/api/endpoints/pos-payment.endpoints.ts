export const POS_PAYMENT = {
  BASE: "/api/v1/pos-payments",
  STATUS: (id: string) => `/api/v1/pos-payments/${id}/status`,
  CANCEL: (id: string) => `/api/v1/pos-payments/${id}/cancel`,
  CONFIRM_MANUAL: (id: string) => `/api/v1/pos-payments/${id}/confirm-manual`,
  EVENTS: (id: string) => `/api/v1/pos-payments/${id}/events`,
} as const;

export const PAYMENT_SETTINGS = {
  TERMINALS: "/api/v1/payment-settings/terminals",
  TERMINAL_BY_ID: (id: string) => `/api/v1/payment-settings/terminals/${id}`,
  PROVIDERS: "/api/v1/payment-settings/providers",
  TEST_PROVIDER: (provider: string) => `/api/v1/payment-settings/providers/${provider}/test`,
} as const;
