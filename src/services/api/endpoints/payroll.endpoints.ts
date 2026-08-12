export const PAYROLL = {
  BASE: "/api/v1/payroll",
  BY_ID: (id: string) => `/api/v1/payroll/${id}`,
  LIST: (params: string) => `/api/v1/payroll${params ? `?${params}` : ""}`,
  ATTENDANCE_SUMMARY: "/api/payroll/attendance-summary",
  ATTENDANCE_SUMMARY_V1: "/api/v1/payroll/attendance-summary",
  COMMISSION_SUMMARY: "/api/payroll/commission-summary",
  COMMISSION_SUMMARY_V1: "/api/v1/payroll/commission-summary",
  SALARY_ADVANCES: "/api/v1/payroll/salary-advances",
  SALARY_ADVANCE_BY_ID: (id: string) => `/api/v1/payroll/salary-advances/${id}`,
  PAY: (id: string) => `/api/v1/payroll/${id}/pay`,
} as const;
