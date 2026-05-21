import type { ReportPeriod, ReportTab } from "../../../types/report.types";

function buildUrl(base: string, period: ReportPeriod, from?: string, to?: string): string {
  const q = new URLSearchParams({ period });
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  return `${base}?${q.toString()}`;
}

export const REPORT = {
  REVENUE:      (period: ReportPeriod, from?: string, to?: string) =>
    buildUrl("/api/v1/reports/revenue",      period, from, to),
  APPOINTMENTS: (period: ReportPeriod, from?: string, to?: string) =>
    buildUrl("/api/v1/reports/appointments", period, from, to),
  CLIENTS:      (period: ReportPeriod, from?: string, to?: string) =>
    buildUrl("/api/v1/reports/clients",      period, from, to),
  STAFF:        (period: ReportPeriod, from?: string, to?: string) =>
    buildUrl("/api/v1/reports/staff",        period, from, to),
  SERVICES:     (period: ReportPeriod, from?: string, to?: string) =>
    buildUrl("/api/v1/reports/services",     period, from, to),
  EXPORT: (tab: ReportTab, period: ReportPeriod, format: "excel" | "csv", from?: string, to?: string) => {
    const q = new URLSearchParams({ tab, period, format });
    if (from) q.set("from", from);
    if (to)   q.set("to",   to);
    return `/api/v1/reports/export?${q.toString()}`;
  },
  DETAIL: (category: string, params: string) =>
    `/api/v1/reports/${category}/detail?${params}`,
  DASHBOARD: (params?: { search?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.category && params.category !== "all") q.set("category", params.category);
    const qs = q.toString();
    return qs ? `/api/v1/reports?${qs}` : "/api/v1/reports";
  },
} as const;
