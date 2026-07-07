export const APPOINTMENT = {
  CANCEL: (appointmentId: string) => `/appointments/${appointmentId}/cancel`,
  CONFIRM: (appointmentId: string) => `/appointments/${appointmentId}/confirm`,
  CREATE: "/appointments",
  DETAIL: (appointmentId: string) => `/appointments/${appointmentId}`,
  HISTORY: "/appointments/history",
  LIST: "/appointments",
  RESCHEDULE: (appointmentId: string) => `/appointments/${appointmentId}/reschedule`,
  START: (appointmentId: string) => `/appointments/${appointmentId}/start`,
  UPDATE: (appointmentId: string) => `/appointments/${appointmentId}`,
} as const;
