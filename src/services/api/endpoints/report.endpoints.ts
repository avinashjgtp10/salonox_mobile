import type { ReportPeriod, ReportTab } from "../../../types/report.types";

export const REPORT = {
  REVENUE:      (period: ReportPeriod) => `/api/v1/reports/revenue?period=${period}`,
  APPOINTMENTS: (period: ReportPeriod) => `/api/v1/reports/appointments?period=${period}`,
  CLIENTS:      (period: ReportPeriod) => `/api/v1/reports/clients?period=${period}`,
  STAFF:        (period: ReportPeriod) => `/api/v1/reports/staff?period=${period}`,
  SERVICES:     (period: ReportPeriod) => `/api/v1/reports/services?period=${period}`,
  EXPORT: (tab: ReportTab, period: ReportPeriod, format: "excel" | "csv") =>
    `/api/v1/reports/export?tab=${tab}&period=${period}&format=${format}`,
  // Detail endpoints — used by individual report detail views
  DETAIL: (category: string, params: string) =>
    `/api/v1/reports/${category}/detail?${params}`,
} as const;
