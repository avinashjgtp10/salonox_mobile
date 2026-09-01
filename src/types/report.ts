export type ReportPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type ReportFilterOption = { id: string; label: string };
export type PaginatedReportRequest = { page?: number; limit?: number; is_export?: boolean };
export type DateRangeReportRequest = PaginatedReportRequest & {
  start_date?: string;
  end_date?: string;
};

export type SalesSummaryReportRequest = DateRangeReportRequest & {
  staff_id?: string;
  search?: string;
  status?: string;
  category_id?: string;
};
export type SalesSummaryReportResponse = {
  rows: {
    id: string; appointmentId: string | null; invoiceNumber: string | null;
    clientName: string | null; clientPhone: string | null; itemDescription: string;
    itemTypes: string; actualPrice: number; price: number; paidAmount: number;
    dueAmount: number; tipAmount: number; ewalletUsed: number;
    membershipWalletUsed: number; rewardPointsValue: number;
    referralCreditUsed: number; paymentMethod: string | null; status: string;
    createdAt: string; staffName: string | null;
  }[];
  pagination: ReportPagination;
  stats: {
    totalBill: number; billAverage: number; totalSale: number; receivedAmount: number;
    totalTip: number; totalEwallet: number; totalMembership: number;
    totalRewards: number; totalReferral: number;
  };
  filtersAvailable: { serviceCategories: ReportFilterOption[] };
};

export type DailySheetReportRequest = PaginatedReportRequest & {
  date?: string; service_id?: string; staff_id?: string; search?: string;
};
export type DailySheetReportResponse = {
  rows: {
    appointmentId: string | null; saleId: string; time: string; ticketNo: string;
    clientName: string | null; serviceId: string | null; service: string;
    staffId: string | null; staff: string | null; amount: number;
    paymentMethod: string | null; status: string;
  }[];
  pagination: ReportPagination;
  totalAmount: number;
  filtersAvailable: { services: ReportFilterOption[]; staff: ReportFilterOption[] };
};

export type ProductRetailReportRequest = DateRangeReportRequest & {
  product_id?: string; search?: string;
};
export type ProductRetailReportResponse = {
  rows: {
    saleId: string; date: string; invoiceNo: string; clientId: string | null;
    clientName: string | null; productId: string | null; productName: string;
    quantity: number; price: number; total: number; taxAmount: number; taxableAmount: number;
  }[];
  pagination: ReportPagination;
  stats: { totalQuantity: number; totalRevenue: number; uniqueProducts: number; lineItems: number };
  filtersAvailable: { products: ReportFilterOption[] };
};

export type ServiceSaleReportRequest = DateRangeReportRequest & {
  staff_id?: string; search?: string;
};
export type ServiceSaleReportResponse = {
  rows: {
    saleId: string; date: string; invoiceNo: string; clientId: string | null;
    clientName: string | null; staffId: string | null; staffName: string | null;
    serviceId: string | null; serviceName: string; price: number;
    taxAmount: number; taxableAmount: number;
  }[];
  pagination: ReportPagination;
  stats: { servicesSold: number; totalRevenue: number; avgTicket: number; uniqueServices: number };
};

export type GstReportRequest = DateRangeReportRequest & { staff_id?: string; search?: string };
export type GstReportResponse = {
  rows: {
    saleId: string; date: string; invoiceNo: string; clientName: string | null;
    taxableAmount: number; taxAmount: number; total: number;
  }[];
  pagination: ReportPagination;
  stats: { invoicesWithTax: number; totalTaxCollected: number; totalAmountCollected: number };
};

export type ProductMarginReportRequest = DateRangeReportRequest;
export type ProductMarginReportResponse = {
  rows: {
    productName: string; quantity: number; revenue: number; cost: number;
    profit: number; marginPct: number;
  }[];
  pagination: ReportPagination;
  stats: { totalRevenue: number; totalCost: number; totalProfit: number; avgMarginPct: number };
};

export type SearchReportRequest = PaginatedReportRequest & { search?: string };
export type RewardPointsReportResponse = {
  rows: {
    clientId: string; clientName: string; mobile: string; pointsAvailable: number;
    pointsEarned: number; pointsRedeemed: number; lastActivityAt: string | null;
  }[];
  pagination: ReportPagination;
  stats: { pointsAvailable: number; totalPointsEarned: number; totalPointsRedeemed: number };
};
export type EWalletReportResponse = {
  rows: {
    clientId: string; clientName: string; phone: string; email: string; balance: number;
  }[];
  pagination: ReportPagination;
  stats: { totalClients: number; withBalance: number; totalWalletValue: number; avgBalance: number };
};

export type ClientRevenueReportRequest = DateRangeReportRequest & { search?: string };
export type ClientRevenueReportResponse = {
  rows: {
    clientId: string | null; clientName: string; contact: string; visits: number;
    totalSpend: number; avgTicket: number; lastVisit: string;
  }[];
  pagination: ReportPagination;
  stats: { totalClients: number; totalRevenue: number; avgSpendPerClient: number; topClient: string };
};

export type StaffSalesPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type StaffSalesReportRequest = {
  start_date?: string; end_date?: string; period?: StaffSalesPeriod; staff_id?: string;
};
export type StaffSalesReportResponse = {
  rows: {
    label: string; bucketDate: string; serviceRevenue: number;
    productRevenue: number; total: number;
  }[];
};

export type StaffItemSalesType = "membership" | "package" | "product" | "service";
export type StaffItemSalesReportRequest = DateRangeReportRequest & {
  item_type?: StaffItemSalesType; staff_id?: string;
};
export type StaffItemSalesReportResponse = {
  rows: {
    staffId: string | null; staffName: string; itemName: string;
    quantity: number; revenue: number; date: string;
  }[];
  pagination: ReportPagination;
  stats: { totalQuantity: number; totalRevenue: number; topItem: string; topStaff: string };
};

export type PackageReportRequest = DateRangeReportRequest & { search?: string };
export type PackageSaleReportResponse = {
  rows: {
    id: string; date: string; clientId: string | null; clientName: string;
    packageName: string; totalAmount: number; paidAmount: number;
    pendingAmount: number; paymentStatus: string; gstAmount: number;
  }[];
  pagination: ReportPagination;
  stats: { packagesSold: number; totalSaleValue: number; totalReceived: number; uniquePackages: number };
};
export type PackageHistoryReportResponse = {
  rows: {
    date: string; clientId: string | null; clientName: string; packageName: string;
    serviceName: string; sessionNo: number; staff: string; status: string;
  }[];
  pagination: ReportPagination;
  stats: { totalSessions: number; completedSessions: number; uniqueClients: number; uniquePackages: number };
};

export type MemberSaleReportRequest = DateRangeReportRequest & { search?: string };
export type MemberSaleReportResponse = {
  rows: {
    id: string; clientId: string | null; purchasedAt: string; clientName: string;
    membershipName: string; pricePaid: number; totalSessions: number;
    usedSessions: number; status: string;
  }[];
  pagination: ReportPagination;
  stats: { membershipsSold: number; totalRevenue: number; activeMemberships: number };
};

export type AppointmentDetailReportRequest = PaginatedReportRequest & {
  from?: string; to?: string; statuses?: string[];
};
export type AppointmentDetailReportResponse = {
  rows: {
    id: string; appointmentDate: string; time: string; bookedDate: string;
    clientName: string | null; serviceName: string; staffName: string | null;
    duration: number; amount: number; paymentMethod: string | null; paymentStatus: string;
  }[];
  pagination: ReportPagination;
};

export type CommissionReportRequest = {
  month?: string; start_date?: string; end_date?: string;
};
export type CommissionReportResponse = {
  summary: {
    totalCommission: number; totalRevenue: number; pendingPayout: number;
    paidOut: number; count: number;
  };
  staff: {
    staffId: string; staffFirstName: string; staffLastName: string | null;
    staffEmail: string; staffCalendarColor: string | null; staffDesignation: string | null;
    totalRevenue: number; totalEarned: number; pendingPayout: number;
    paidOut: number; transactionCount: number; categories: string[];
  }[];
};

export type AttendanceReportRequest = { start_date: string; end_date: string };
export type AttendanceReportResponse = {
  staff: { id: string; fullName: string; role: string }[];
  records: {
    id: string; salonId: string; staffId: string; date: string; status: string;
    checkIn: string | null; checkOut: string | null; hoursWorked: number | null;
    source: string; note: string | null; staffName?: string; staffRole?: string;
  }[];
};

export type ProductInventoryReportRequest = {
  branch_id: string; start_date?: string; end_date?: string;
  search?: string; category_id?: string;
};
export type ProductInventoryReportResponse = {
  rows: {
    productId: string; categoryName: string; itemName: string; actualStock: number;
    adjustStock: number; stockDifference: number; stockValue: number;
    actualConsumable: number; adjustConsumable: number; unit: string;
    consumableDifference: number; remark: string; quantitySold: number; salesRevenue: number;
  }[];
};

// Web-parity legacy report: the Web app's Consumable Usage Report calls the
// legacy inventory reconciliation endpoint (GET /inventory/stock-reconciliation
// ?branch_id=...) rather than a POST /api/report/* route — there is no
// dedicated consumable-usage report endpoint on the backend. Mobile mirrors
// that exact contract rather than inventing a modern one. Row shape and
// field names verified against the Web source (ConsumableUsageReport.tsx).
export type ConsumableUsageReportRequest = {
  branch_id: string;
};

export type ConsumableUsageReportRow = {
  actualConsumable: number;
  actualStock: number;
  adjustConsumable: number;
  adjustStock: number;
  categoryName: string;
  consumableDifference: number;
  itemName: string;
  productId: string;
  remark: string;
  stockDifference: number;
  stockValue: number;
  unit: string;
};

export type ConsumableUsageReportResponse = {
  rows: ConsumableUsageReportRow[];
};

export type WhatsAppCampaignReportType = "blocked" | "failed" | "successful";
export type WhatsAppCampaignReportRequest = {
  campaign_id?: string;
  report_type?: WhatsAppCampaignReportType;
};
export type WhatsAppCampaignContact = {
  id: string; campaignId: string; phone: string; name: string | null;
  variables: Record<string, unknown>;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED";
  wamid: string | null; errorCode: string | null; errorMessage: string | null;
  sentAt: string | null; deliveredAt: string | null; readAt: string | null;
  createdAt: string; updatedAt: string;
};
export type WhatsAppCampaign = {
  id: string; salonId: string; name: string; templateId: string;
  templateName?: string; templateBody?: string; batchSize: number;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "PAUSED" | "COMPLETED" | "FAILED";
  totalContacts: number; sentCount: number; deliveredCount: number;
  readCount: number; failedCount: number; blockedCount: number;
  scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
  createdAt: string; updatedAt: string;
};
export type WhatsAppCampaignReportResponse = {
  campaigns: WhatsAppCampaign[];
  contacts?: WhatsAppCampaignContact[];
};
