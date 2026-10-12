export const APPOINTMENT = {
  CANCEL: (appointmentId: string) => `/appointments/${appointmentId}/cancel`,
  CHECKOUT: (appointmentId: string) => `/appointments/${appointmentId}/checkout`,
  CREATE: "/appointments",
  DETAIL: (appointmentId: string) => `/appointments/${appointmentId}`,
  HANDOFF_ITEM: (appointmentId: string, itemId: string) => `/appointments/${appointmentId}/items/${itemId}/handoff`,
  ITEM_STATUS: (appointmentId: string, itemId: string) => `/appointments/${appointmentId}/items/${itemId}/status`,
  LIST: "/appointments",
  UPDATE: (appointmentId: string) => `/appointments/${appointmentId}`,
} as const;
