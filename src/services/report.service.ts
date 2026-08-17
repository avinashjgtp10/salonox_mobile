import { API_BASE_URL, api } from "@/services/api";
import { REPORT } from "@/services/api/endpoints/report.endpoints";
import type { ApiResponse } from "@/types/auth";
import type { ConsumableUsageReportResponse, ConsumableUsageReportRow } from "@/types/report";

const getApiOrigin = (apiBaseUrl: string) => {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    throw new Error("The Reports API origin could not be derived from the API configuration.");
  }
};

const REPORT_API_ORIGIN = getApiOrigin(API_BASE_URL);

const camelizeKey = (key: string) =>
  key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const camelize = <T>(value: unknown): T => {
  if (Array.isArray(value)) {
    return value.map((item) => camelize(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        camelizeKey(key),
        camelize(nestedValue),
      ]),
    ) as T;
  }

  return value as T;
};

const unwrap = <T>(response: { data: ApiResponse<unknown> }) =>
  camelize<T>(response.data.data);

const toReportNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : 0;
};

export type GenericReportRequest = Record<string, unknown>;
export type GenericReportResponse = Record<string, unknown>;

export type SalesSummaryDetailItem = {
  discountAmount: number;
  id: string;
  itemId: string | null;
  itemType: string;
  name: string;
  quantity: number;
  staffName: string | null;
  totalPrice: number;
  unitPrice: number;
};

export type SalesSummaryDetailPayment = {
  dueAmount: number;
  ewalletUsed: number;
  membershipWalletUsed: number;
  paidAmount: number;
  referralCreditUsed: number;
  rewardPointsValue: number;
  taxBreakdown: unknown[] | null;
};

export type SalesSummaryDetailSale = {
  appointmentId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  couponCode: string | null;
  couponDiscountAmount: number;
  createdAt: string;
  discountAmount: number;
  exCharges: number;
  id: string;
  invoiceNumber: string | null;
  manualDiscountAmount: number;
  notes: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  referralDiscountAmount: number;
  staffName: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
};

export type SalesSummaryDetailResponse = {
  items: SalesSummaryDetailItem[];
  payment: SalesSummaryDetailPayment | null;
  sale: SalesSummaryDetailSale | null;
};

export const reportService = {
  async getReport(
    endpoint: `/api/report/${string}`,
    request: GenericReportRequest,
  ): Promise<GenericReportResponse> {
    const response = await api.post<ApiResponse<unknown>>(
      `${REPORT_API_ORIGIN}${endpoint}`,
      request,
    );

    return unwrap<GenericReportResponse>(response);
  },

  async getSalesSummaryDetail(saleId: string): Promise<SalesSummaryDetailResponse> {
    const response = await api.get<ApiResponse<unknown>>(
      `${REPORT_API_ORIGIN}${REPORT.SALES_SUMMARY_DETAIL(saleId)}`,
    );

    return unwrap<SalesSummaryDetailResponse>(response);
  },

  // Web-parity legacy report endpoint — see types/report.ts. Unlike
  // getReport() above, this is a GET against the versioned /api/v1 API (the
  // shared `api` client's own baseURL), not a POST to the unversioned
  // REPORT_API_ORIGIN — it is not a /api/report/* route. The Web app sends
  // only branch_id; no date range, search, or category filter is sent to
  // the backend (those are applied client-side by the caller).
  async getConsumableUsage(branchId: string): Promise<ConsumableUsageReportResponse> {
    const response = await api.get<ApiResponse<unknown>>(REPORT.STOCK_RECONCILIATION, {
      params: { branch_id: branchId },
    });
    const rows = camelize<ConsumableUsageReportRow[]>(response.data.data);

    // Verified live: every numeric-looking field in this legacy endpoint's
    // response ("0", "1.00", "675.00") comes back as a string, not a JSON
    // number — camelize() only renames keys, it doesn't touch values. Left
    // uncoerced, ReportRowCard's shared formatReportValue() would skip its
    // number/currency formatting (typeof value !== "number") and fall back
    // to printing the raw string.
    return {
      rows: (Array.isArray(rows) ? rows : []).map((row) => ({
        ...row,
        actualConsumable: toReportNumber(row.actualConsumable),
        actualStock: toReportNumber(row.actualStock),
        adjustConsumable: toReportNumber(row.adjustConsumable),
        adjustStock: toReportNumber(row.adjustStock),
        consumableDifference: toReportNumber(row.consumableDifference),
        stockDifference: toReportNumber(row.stockDifference),
        stockValue: toReportNumber(row.stockValue),
      })),
    };
  },
};
