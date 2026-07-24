export const PAYMENT = {
  BASE: "/payments",
  BY_ID: (paymentId: string) => `/payments/${paymentId}`,
} as const;
