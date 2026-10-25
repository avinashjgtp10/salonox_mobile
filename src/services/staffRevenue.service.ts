import { api } from "@/services/api";
import { MOBILE_STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import { asRecord, toSafeNumber, type UnknownRecord } from "@/utils/apiNormalize";

/** The logged-in staff member's row of the web Staff Performance report. */
export type StaffRevenue = {
  avgBill: number;
  collected: number;
  due: number;
  invoiceCount: number;
  membershipCount: number;
  membershipRevenue: number;
  packageCount: number;
  packageRevenue: number;
  productCount: number;
  productRevenue: number;
  serviceCount: number;
  serviceRevenue: number;
  totalRevenue: number;
};

const EMPTY_REVENUE: StaffRevenue = {
  avgBill: 0, collected: 0, due: 0, invoiceCount: 0,
  membershipCount: 0, membershipRevenue: 0, packageCount: 0, packageRevenue: 0,
  productCount: 0, productRevenue: 0, serviceCount: 0, serviceRevenue: 0, totalRevenue: 0,
};

const toRevenue = (row: UnknownRecord | null): StaffRevenue => row ? {
  avgBill: toSafeNumber(row.avg_bill),
  collected: toSafeNumber(row.collected),
  due: toSafeNumber(row.due),
  invoiceCount: toSafeNumber(row.invoice_count),
  membershipCount: toSafeNumber(row.membership_count),
  membershipRevenue: toSafeNumber(row.membership_revenue),
  packageCount: toSafeNumber(row.package_count),
  packageRevenue: toSafeNumber(row.package_revenue),
  productCount: toSafeNumber(row.product_count),
  productRevenue: toSafeNumber(row.product_revenue),
  serviceCount: toSafeNumber(row.service_count),
  serviceRevenue: toSafeNumber(row.service_revenue),
  totalRevenue: toSafeNumber(row.total_revenue),
} : EMPTY_REVENUE;

export const staffRevenueService = {
  /** Server-scoped to the caller's own staff record; no staff id is sent. */
  async getRevenue(params: { endDate: string; startDate: string }): Promise<StaffRevenue> {
    const response = await api.get<ApiResponse<{ revenue?: UnknownRecord | null }>>(MOBILE_STAFF.REVENUE, {
      params: { end_date: params.endDate, start_date: params.startDate },
    });
    const revenue = asRecord(response.data?.data).revenue;
    return toRevenue(revenue ? asRecord(revenue) : null);
  },
};
