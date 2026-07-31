export const REPORT = {
  APPOINTMENT_DETAIL: "/api/report/appointment-detail",
  ATTENDANCE_RANGE: "/attendance/range",
  CAMPAIGNS: "/campaigns",
  CAMPAIGN_REPORT: (campaignId: string, type: WhatsAppCampaignReportType) =>
    `/campaigns/${campaignId}/report/${type}`,
  CLIENT_REVENUE: "/api/report/client-revenue",
  COMMISSIONS_EARNED: "/staff/commissions/earned",
  COMMISSIONS_SUMMARY: "/staff/commissions/summary",
  DAILY_SHEET: "/api/report/daily-sheet",
  E_WALLET: "/api/report/ewallet",
  GST: "/api/report/gst",
  MEMBER_SALE: "/api/report/member-sale",
  PACKAGE_HISTORY: "/api/report/package-history",
  PACKAGE_SALE: "/api/report/package-sale",
  PRODUCT_INVENTORY_SALES: "/api/report/product-inventory-sales",
  PRODUCT_MARGIN: "/api/report/product-margin",
  PRODUCT_RETAIL: "/api/report/product-retail",
  REWARD_POINTS: "/api/report/reward-points",
  SALES_SUMMARY: "/api/report/sales-summary",
  SERVICE_SALE: "/api/report/service-sale",
  STAFF_ITEM_SALES: "/api/report/staff-item-sales",
  STAFF_SALES: "/api/report/staff-sales",
  STOCK_RECONCILIATION: "/inventory/stock-reconciliation",
} as const;

export type WhatsAppCampaignReportType = "blocked" | "failed" | "successful";
