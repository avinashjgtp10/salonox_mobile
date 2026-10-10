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

const getReportApiOrigin = () => getApiOrigin(API_BASE_URL);

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
  /** Same item-level revenue (including GST) as the Staff Performance drill-down.
   * The report endpoint resolves the salon from the authenticated session.
   */
  async getStaffPerformanceRevenue(range: { start_date: string; end_date: string }, allStaff = false) {
    const records: { id: string; name: string; revenue: number }[] = [];
    let page = 1;
    do {
      const response = await this.getReport(REPORT.STAFF_PERFORMANCE, {
        ...range,
        include_gst: true,
        page,
        limit: allStaff ? 200 : 8,
      });
      const rows = response.rows as {
        staffId: string; staffName: string; totalRevenue: number | string;
      }[] | undefined;
      const mapped = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row.staffId,
        name: row.staffName,
        revenue: toReportNumber(row.totalRevenue),
      }));
      records.push(...mapped);
      const pagination = response.pagination as { totalPages?: number } | undefined;
      if (!allStaff || page >= (pagination?.totalPages ?? 1)) return records;
      if (mapped.length === 0) throw new Error("Incomplete staff revenue pagination");
      page += 1;
    } while (true);
  },

  /** Average customer rating for staff in a date range (client-rating report stats). */
  async getStaffRating(staffIds: string[], range: { start_date: string; end_date: string }) {
    const response = await this.getReport(REPORT.CLIENT_RATING, { ...range, staff_ids: staffIds, page: 1, limit: 1 });
    const stats = (response.stats ?? {}) as { averageRating?: unknown; totalReviews?: unknown };
    return { averageRating: toReportNumber(stats.averageRating), totalReviews: toReportNumber(stats.totalReviews) };
  },

  async getReport(
    endpoint: `/api/report/${string}`,
    request: GenericReportRequest,
  ): Promise<GenericReportResponse> {
    const response = await api.post<ApiResponse<unknown>>(
      `${getReportApiOrigin()}${endpoint}`,
      request,
    );

    return unwrap<GenericReportResponse>(response);
  },

  async getSalesSummaryDetail(saleId: string): Promise<SalesSummaryDetailResponse> {
    const response = await api.get<ApiResponse<unknown>>(
      `${getReportApiOrigin()}${REPORT.SALES_SUMMARY_DETAIL(saleId)}`,
    );

    return unwrap<SalesSummaryDetailResponse>(response);
  },

  async getConsumableUsage(branchId: string): Promise<ConsumableUsageReportResponse> {
    const response = await api.get<ApiResponse<unknown>>(REPORT.STOCK_RECONCILIATION, {
      params: { branch_id: branchId },
    });
    const rows = camelize<ConsumableUsageReportRow[]>(response.data.data);

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
