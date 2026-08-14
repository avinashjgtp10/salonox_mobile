import { API_BASE_URL, api } from "@/services/api";
import { REPORT } from "@/services/api/endpoints/report.endpoints";
import type { ApiResponse } from "@/types/auth";

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
};
