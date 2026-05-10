export const PAYMENT = {
  BASE: "/api/v1/payments",
  BY_APPOINTMENT: (appointmentId: string) => `/api/v1/payments/${appointmentId}`,
} as const;
