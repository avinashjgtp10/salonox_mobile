import { API_BASE_URL, api } from "@/services/api";
import { REPORT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  AppointmentDetailReportRequest,
  AppointmentDetailReportResponse,
  AttendanceReportRequest,
  AttendanceReportResponse,
  ClientRevenueReportRequest,
  ClientRevenueReportResponse,
  CommissionReportRequest,
  CommissionReportResponse,
  ConsumableUsageReportResponse,
  DailySheetReportRequest,
  DailySheetReportResponse,
  EWalletReportResponse,
  GstReportRequest,
  GstReportResponse,
  MemberSaleReportRequest,
  MemberSaleReportResponse,
  PackageHistoryReportResponse,
  PackageReportRequest,
  PackageSaleReportResponse,
  ProductInventoryReportRequest,
  ProductInventoryReportResponse,
  ProductMarginReportRequest,
  ProductMarginReportResponse,
  ProductRetailReportRequest,
  ProductRetailReportResponse,
  RewardPointsReportResponse,
  SalesSummaryReportRequest,
  SalesSummaryReportResponse,
  SearchReportRequest,
  ServiceSaleReportRequest,
  ServiceSaleReportResponse,
  StaffItemSalesReportRequest,
  StaffItemSalesReportResponse,
  StaffSalesReportRequest,
  StaffSalesReportResponse,
  WhatsAppCampaign,
  WhatsAppCampaignContact,
  WhatsAppCampaignReportRequest,
  WhatsAppCampaignReportResponse,
} from "@/types/report";

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

const postReport = async <TResponse, TRequest extends object>(
  endpoint: string,
  request: TRequest,
) => {
  const response = await api.post<ApiResponse<unknown>>(
    `${REPORT_API_ORIGIN}${endpoint}`,
    request,
  );

  return unwrap<TResponse>(response);
};

export const reportService = {
  getSalesSummary(request: SalesSummaryReportRequest) {
    return postReport<SalesSummaryReportResponse, SalesSummaryReportRequest>(
      REPORT.SALES_SUMMARY,
      request,
    );
  },

  getDailySheet(request: DailySheetReportRequest) {
    return postReport<DailySheetReportResponse, DailySheetReportRequest>(
      REPORT.DAILY_SHEET,
      request,
    );
  },

  getProductRetail(request: ProductRetailReportRequest) {
    return postReport<ProductRetailReportResponse, ProductRetailReportRequest>(
      REPORT.PRODUCT_RETAIL,
      request,
    );
  },

  getServiceSale(request: ServiceSaleReportRequest) {
    return postReport<ServiceSaleReportResponse, ServiceSaleReportRequest>(
      REPORT.SERVICE_SALE,
      request,
    );
  },

  getGst(request: GstReportRequest) {
    return postReport<GstReportResponse, GstReportRequest>(REPORT.GST, request);
  },

  getProductMargin(request: ProductMarginReportRequest) {
    return postReport<ProductMarginReportResponse, ProductMarginReportRequest>(
      REPORT.PRODUCT_MARGIN,
      request,
    );
  },

  getRewardPoints(request: SearchReportRequest) {
    return postReport<RewardPointsReportResponse, SearchReportRequest>(
      REPORT.REWARD_POINTS,
      request,
    );
  },

  getEWallet(request: SearchReportRequest) {
    return postReport<EWalletReportResponse, SearchReportRequest>(
      REPORT.E_WALLET,
      request,
    );
  },

  getClientRevenue(request: ClientRevenueReportRequest) {
    return postReport<ClientRevenueReportResponse, ClientRevenueReportRequest>(
      REPORT.CLIENT_REVENUE,
      request,
    );
  },

  getStaffSales(request: StaffSalesReportRequest) {
    return postReport<StaffSalesReportResponse, StaffSalesReportRequest>(
      REPORT.STAFF_SALES,
      request,
    );
  },

  getStaffItemSales(request: StaffItemSalesReportRequest) {
    return postReport<StaffItemSalesReportResponse, StaffItemSalesReportRequest>(
      REPORT.STAFF_ITEM_SALES,
      request,
    );
  },

  async getCommission(request: CommissionReportRequest): Promise<CommissionReportResponse> {
    const [summaryResponse, earnedResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>(REPORT.COMMISSIONS_SUMMARY, { params: request }),
      api.get<ApiResponse<unknown>>(REPORT.COMMISSIONS_EARNED, { params: request }),
    ]);

    return {
      summary: unwrap<CommissionReportResponse["summary"]>(summaryResponse),
      staff: unwrap<CommissionReportResponse["staff"]>(earnedResponse),
    };
  },

  async getAttendance(request: AttendanceReportRequest): Promise<AttendanceReportResponse> {
    const response = await api.get<ApiResponse<unknown>>(REPORT.ATTENDANCE_RANGE, {
      params: request,
    });

    return unwrap<AttendanceReportResponse>(response);
  },

  getAppointmentDetail(request: AppointmentDetailReportRequest) {
    return postReport<AppointmentDetailReportResponse, AppointmentDetailReportRequest>(
      REPORT.APPOINTMENT_DETAIL,
      request,
    );
  },

  async getProductInventory(
    request: ProductInventoryReportRequest,
  ): Promise<ProductInventoryReportResponse> {
    const { branch_id, category_id, end_date, search, start_date } = request;
    const [stockResponse, salesResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>(REPORT.STOCK_RECONCILIATION, {
        params: { branch_id, category_id, search },
      }),
      api.post<ApiResponse<unknown>>(
        `${REPORT_API_ORIGIN}${REPORT.PRODUCT_INVENTORY_SALES}`,
        { start_date, end_date },
      ),
    ]);

    const stockRows = unwrap<Omit<ProductInventoryReportResponse["rows"][number],
      "quantitySold" | "salesRevenue">[]>(stockResponse);
    const salesByProduct = unwrap<Record<string, { quantity: number; revenue: number }>>(
      salesResponse,
    );

    return {
      rows: stockRows.map((row) => {
        const sales = salesByProduct[row.productId];

        return {
          ...row,
          quantitySold: sales?.quantity ?? 0,
          salesRevenue: sales?.revenue ?? 0,
        };
      }),
    };
  },

  async getConsumableUsage(): Promise<ConsumableUsageReportResponse> {
    throw new Error("Consumable Usage report is not supported by the current backend.");
  },

  getPackageSale(request: PackageReportRequest) {
    return postReport<PackageSaleReportResponse, PackageReportRequest>(
      REPORT.PACKAGE_SALE,
      request,
    );
  },

  getPackageHistory(request: PackageReportRequest) {
    return postReport<PackageHistoryReportResponse, PackageReportRequest>(
      REPORT.PACKAGE_HISTORY,
      request,
    );
  },

  getMemberSale(request: MemberSaleReportRequest) {
    return postReport<MemberSaleReportResponse, MemberSaleReportRequest>(
      REPORT.MEMBER_SALE,
      request,
    );
  },

  async getWhatsAppCampaign(
    request: WhatsAppCampaignReportRequest = {},
  ): Promise<WhatsAppCampaignReportResponse> {
    const campaignsResponse = await api.get<ApiResponse<unknown>>(REPORT.CAMPAIGNS);
    const campaigns = unwrap<WhatsAppCampaign[]>(campaignsResponse);

    if (!request.campaign_id || !request.report_type) {
      return { campaigns };
    }

    const contactsResponse = await api.get<ApiResponse<unknown>>(
      REPORT.CAMPAIGN_REPORT(request.campaign_id, request.report_type),
    );

    return {
      campaigns,
      contacts: unwrap<WhatsAppCampaignContact[]>(contactsResponse),
    };
  },
};
