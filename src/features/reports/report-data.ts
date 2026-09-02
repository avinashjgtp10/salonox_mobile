import type { ReportData } from "@/store/report/report.slice";
import type { ReportSlug } from "@/features/reports/report-config";
import { formatAppDateTime } from "@/utils/dateTime";
import { formatInvoiceNumber } from "@/utils/receipt";

export type ReportRow = Record<string, unknown>;

const asRows = (value: unknown): ReportRow[] =>
  Array.isArray(value)
    ? value.filter((item): item is ReportRow => item !== null && typeof item === "object")
    : [];

export const getReportRows = (slug: ReportSlug, data: ReportData | null) => {
  if (!data) return [];
  void slug;
  return asRows(data.rows);
};

export const getReportSummary = (slug: ReportSlug, data: ReportData | null) => {
  if (!data) return null;
  void slug;
  if (data.stats && typeof data.stats === "object") return data.stats as ReportRow;
  if (typeof data.totalAmount === "number") return { totalAmount: data.totalAmount };
  return null;
};

export const getReportPagination = (data: ReportData | null) => {
  if (!data?.pagination || typeof data.pagination !== "object") return null;
  const pagination = data.pagination as Record<string, unknown>;
  return {
    limit: typeof pagination.limit === "number" ? pagination.limit : 10,
    page: typeof pagination.page === "number" ? pagination.page : 1,
    total: typeof pagination.total === "number" ? pagination.total : 0,
    totalPages: typeof pagination.totalPages === "number" ? pagination.totalPages : 1,
  };
};

export const humanizeReportKey = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());

const currencyKey = /(amount|revenue|price|sale|spend|cost|profit|balance|payout|earned|value|tax|total)$/i;
const percentKey = /(pct|percent)$/i;

export const formatReportValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "invoiceNumber" || key === "invoiceNo") {
    return formatInvoiceNumber(
      typeof value === "string" || typeof value === "number" ? value : null,
    ) ?? "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    if (percentKey.test(key)) return `${value.toLocaleString("en-IN")}%`;
    if (currencyKey.test(key)) {
      return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T| )/.test(value)) {
    return formatAppDateTime(value, "—");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") {
      return typeof record.count === "number"
        ? `${record.name} (${record.count.toLocaleString("en-IN")})`
        : record.name;
    }
    if (typeof record.label === "string") return record.label;
    if (typeof record.title === "string") return record.title;
    return "â€”";
  }
  return String(value);
};

export const getReportRowKey = (row: ReportRow, index: number) => {
  const candidate = row.id ?? row.saleId ?? row.clientId ?? row.productId
    ?? row.staffId ?? row.appointmentId ?? row.invoiceNo;
  return candidate ? `${String(candidate)}-${index}` : `report-row-${index}`;
};
