export const PAYROLL = {
  BASE: "/api/v1/payroll",
  LIST: (params: string) => `/api/v1/payroll${params ? `?${params}` : ""}`,
  PAY: (id: string) => `/api/v1/payroll/${id}/pay`,
} as const;
