export const APPOINTMENT = {
  CANCEL: (appointmentId: string) => `/appointments/${appointmentId}/cancel`,
  CHECKOUT: (appointmentId: string) => `/appointments/${appointmentId}/checkout`,
  CREATE: "/appointments",
  DETAIL: (appointmentId: string) => `/appointments/${appointmentId}`,
  LIST: "/appointments",
  UPDATE: (appointmentId: string) => `/appointments/${appointmentId}`,
} as const;
