import { createAsyncThunk } from "@reduxjs/toolkit";

import type { ReportFilters, ReportSlug } from "@/features/reports/report-config";
import { getApiErrorMessage } from "@/services/api";
import { reportService } from "@/services/report.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  AppointmentDetailReportRequest,
  AttendanceReportRequest,
  ClientRevenueReportRequest,
  CommissionReportRequest,
  DailySheetReportRequest,
  GstReportRequest,
  MemberSaleReportRequest,
  PackageReportRequest,
  ProductInventoryReportRequest,
  ProductMarginReportRequest,
  ProductRetailReportRequest,
  SalesSummaryReportRequest,
  SearchReportRequest,
  ServiceSaleReportRequest,
  StaffItemSalesReportRequest,
  StaffSalesReportRequest,
  WhatsAppCampaignReportRequest,
} from "@/types/report";

export type FetchReportArgs = {
  append?: boolean;
  filters: ReportFilters;
  refresh?: boolean;
  slug: ReportSlug;
};

type ReportRejectValue = { message: string };

const cleanFilters = (filters: ReportFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined),
  ) as ReportFilters;

const fetchReport = async (
  slug: ReportSlug,
  filters: ReportFilters,
  branchId: string | null,
): Promise<unknown> => {
  const request = cleanFilters(filters);

  switch (slug) {
    case "sales-summary":
      return reportService.getSalesSummary(request as SalesSummaryReportRequest);
    case "daily-sheet":
      return reportService.getDailySheet(request as DailySheetReportRequest);
    case "product-retail":
      return reportService.getProductRetail(request as ProductRetailReportRequest);
    case "service-sale":
      return reportService.getServiceSale(request as ServiceSaleReportRequest);
    case "gst":
      return reportService.getGst(request as GstReportRequest);
    case "product-margin":
      return reportService.getProductMargin(request as ProductMarginReportRequest);
    case "reward-points":
      return reportService.getRewardPoints(request as SearchReportRequest);
    case "e-wallet":
      return reportService.getEWallet(request as SearchReportRequest);
    case "client-revenue":
      return reportService.getClientRevenue(request as ClientRevenueReportRequest);
    case "staff-sales":
      return reportService.getStaffSales(request as StaffSalesReportRequest);
    case "staff-item-sales":
      return reportService.getStaffItemSales(request as StaffItemSalesReportRequest);
    case "commission":
      return reportService.getCommission(request as CommissionReportRequest);
    case "attendance":
      return reportService.getAttendance(request as AttendanceReportRequest);
    case "appointment-detail":
      return reportService.getAppointmentDetail({
        ...request,
        ...(typeof request.statuses === "string" && request.statuses
          ? { statuses: [request.statuses] }
          : {}),
      } as AppointmentDetailReportRequest);
    case "product-inventory":
      if (!branchId) throw new Error("Select a branch to view product inventory.");
      return reportService.getProductInventory({
        ...request,
        branch_id: branchId,
      } as ProductInventoryReportRequest);
    case "package-sale":
      return reportService.getPackageSale(request as PackageReportRequest);
    case "package-history":
      return reportService.getPackageHistory(request as PackageReportRequest);
    case "member-sale":
      return reportService.getMemberSale(request as MemberSaleReportRequest);
    case "whatsapp-campaign":
      return reportService.getWhatsAppCampaign(request as WhatsAppCampaignReportRequest);
  }
};

export const fetchReportThunk = createAsyncThunk<
  { data: unknown; filters: ReportFilters; slug: ReportSlug },
  FetchReportArgs,
  { rejectValue: ReportRejectValue; state: RootState }
>(
  "report/fetch",
  async (args, { getState, rejectWithValue }) => {
    try {
      const data = await fetchReport(
        args.slug,
        args.filters,
        selectActiveBranchId(getState()),
      );

      return { data, filters: args.filters, slug: args.slug };
    } catch (error) {
      return rejectWithValue({
        message: getApiErrorMessage(error) || "Unable to load this report.",
      });
    }
  },
  {
    condition: (args, { getState }) => {
      const entry = getState().report.bySlug[args.slug];
      return !entry?.loading && !entry?.loadingMore && !entry?.refreshing;
    },
  },
);
