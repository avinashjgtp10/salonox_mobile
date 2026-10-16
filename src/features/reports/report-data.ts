import type { ReportData } from "@/store/report/report.slice";
import type { ReportSlug } from "@/features/reports/report-config";
import { formatCurrency } from "@/utils/currency";
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
  if (slug === "staff-performance") {
    const stats = (data.stats ?? {}) as ReportRow;
    return {
      totalBill: stats.totalBill,
      pendingAmount: stats.pendingAmount,
      paidAmount: stats.paidAmount,
      totalStaff: stats.totalStaff,
      totalRevenue: stats.totalRevenue,
      productRevenue: stats.productRevenue,
      packageRevenue: stats.packageRevenue,
      membershipRevenue: stats.membershipRevenue,
      totalCommission: stats.totalCommission,
    };
  }
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

const currencyKey = /(amount|revenue|price|sale|spend|cost|profit|balance|payout|earned|value|tax|total|paid|due|commission|pay|avgticket)$/i;
const percentKey = /(pct|percent)$/i;
// Money fields whose names don't end in one of the words above. Each is shown
// with formatAmount (₹, 2 decimals) in the matching web report.
const MONEY_KEYS = new Set([
  "amountDeducted", "avgBill", "avgSpendPerClient", "baseSalary", "billAverage", "bonus",
  "cashExpense", "collected", "deductions", "ewalletUsed", "inStoreCash", "membershipWalletUsed",
  "packageUsed", "paidOut", "referralCreditUsed", "revenueGenerated", "salaryAdvance", "tips",
  "totalAmountCollected", "totalBilled", "totalCashExpense", "totalCollected", "totalDiscount",
  "totalDiscountGiven", "totalEwallet", "totalGst", "totalLoyaltyGiven", "totalMembership",
  "totalNetPayroll", "totalPackage", "totalPending", "totalReceived", "totalReferral",
  "totalRevenueGenerated", "totalRewards", "totalSpendWhenActive", "totalTaxCollected", "totalTip",
  "totalTips", "totalWalletUsed",
]);
// Counts and points whose names happen to end in a money word; the web shows
// these as plain numbers.
const NOT_MONEY_KEYS = new Set([
  "daysSinceLastSale", "invoicesWithTax", "pointsEarned", "totalCustomersWithDue",
  "totalPointsEarned", "withBalance",
]);
const isMoneyKey = (key: string) => !NOT_MONEY_KEYS.has(key) && (MONEY_KEYS.has(key) || currencyKey.test(key));
const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

export const formatReportValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "invoiceNumber" || key === "invoiceNo") {
    return formatInvoiceNumber(
      typeof value === "string" || typeof value === "number" ? value : null,
    ) ?? "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  // Postgres numeric columns can arrive as strings ("1856.40"); money must still
  // be shown as money.
  if (typeof value === "string" && isMoneyKey(key) && NUMERIC_STRING.test(value.trim())) {
    return formatCurrency(Number(value));
  }
  if (typeof value === "number") {
    if (percentKey.test(key)) return `${value.toLocaleString("en-IN")}%`;
    if (isMoneyKey(key)) return formatCurrency(value);
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
    return "—";
  }
  return String(value);
};

export const getReportRowKey = (row: ReportRow, index: number) => {
  const candidate = row.id ?? row.saleId ?? row.clientId ?? row.productId
    ?? row.staffId ?? row.appointmentId ?? row.invoiceNo;
  return candidate ? `${String(candidate)}-${index}` : `report-row-${index}`;
};
