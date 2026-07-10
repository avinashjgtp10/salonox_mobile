export const PAYMENT = {
  BASE: "/api/v1/payments",
  BY_ID: (id: string | number) => `/api/v1/payments/${id}`,

  /** Mark an existing unpaid/partial booking as fully cleared */
  CLEAR_DUE: (appointmentId: string | number) =>
    `/api/v1/appointments/${appointmentId}/clear-due`,
} as const;
