export const PAYROLL = {
  STAFF_SUMMARY: (params: string) => `/api/v1/payroll/staff-summary${params ? `?${params}` : ""}`,
  ADJUST: (staffId: string) => `/api/v1/payroll/${staffId}/adjust`,
  PAY: (staffId: string) => `/api/v1/payroll/${staffId}/pay`,
  HISTORY: (staffId: string) => `/api/v1/payroll/${staffId}/history`,
  SLIP: (staffId: string, params: string) => `/api/v1/payroll/${staffId}/slip${params ? `?${params}` : ""}`,
  RECEIPT: (staffId: string, params: string) => `/api/v1/payroll/${staffId}/receipt${params ? `?${params}` : ""}`,
  SALARY_ADVANCES: "/api/v1/payroll/salary-advances",
  SALARY_ADVANCE_BY_ID: (id: string) => `/api/v1/payroll/salary-advances/${id}`,
} as const;
