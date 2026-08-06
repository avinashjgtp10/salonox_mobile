export const REPORT = {
  APPOINTMENT_DETAIL_TABLE: (params: string) =>
    `/api/v1/reports/appointment-detail/table?${params}`,
  DAILY_SHEET_TABLE: (params: string) =>
    `/api/v1/reports/daily-sheet/table?${params}`,
  REWARD_POINTS_TABLE: (params: string) =>
    `/api/v1/reports/reward-points/table?${params}`,
} as const;

// Independent Sales Summary reporting API — reads sales/payments directly,
// never through the Appointment API. Mounted at /api/report (not /api/v1).
export const SALES_REPORT = {
  SUMMARY: () => `/api/report/sales-summary`,
  DETAIL: (saleId: string) => `/api/report/sales-summary/${saleId}`,
} as const;

// Independent Daily Sheet reporting API — reads sales/sale_items directly,
// never through the Appointment API. Mounted at /api/report (not /api/v1).
export const DAILY_SHEET_REPORT = {
  SUMMARY: () => `/api/report/daily-sheet`,
} as const;

// Independent Product Retail reporting API — reads sales/sale_items
// directly, never through the Appointment API. Mounted at /api/report.
export const PRODUCT_RETAIL_REPORT = {
  SUMMARY: () => `/api/report/product-retail`,
} as const;

// Per-product units-sold + revenue, keyed by product_id — powers the "Sales"
// column on the Product Inventory report. Reads sales/sale_items directly,
// never through the Appointment API. Mounted at /api/report.
export const PRODUCT_INVENTORY_SALES_REPORT = {
  SUMMARY: () => `/api/report/product-inventory-sales`,
} as const;

// Independent Product Inventory reporting API — reads products directly
// (brand/category joined by name, sales folded in from the aggregate above),
// never through the Appointment API. Mounted at /api/report.
export const PRODUCT_INVENTORY_REPORT = {
  SUMMARY: () => `/api/report/product-inventory`,
} as const;

// Independent Service Sale reporting API — reads sales/sale_items directly,
// never through the Appointment API. Mounted at /api/report.
export const SERVICE_SALE_REPORT = {
  SUMMARY: () => `/api/report/service-sale`,
} as const;

// Independent GST/Taxes reporting API — reads sales directly, never through
// the Appointment API. Mounted at /api/report.
export const GST_REPORT = {
  SUMMARY: () => `/api/report/gst`,
} as const;

// Independent Product Margin reporting API — reads sale_items/products
// directly, never through the Appointment API. Mounted at /api/report.
export const PRODUCT_MARGIN_REPORT = {
  SUMMARY: () => `/api/report/product-margin`,
} as const;

// Independent Reward Points reporting API — reads clients/reward_points_ledger
// directly, never through the Appointment API. Mounted at /api/report.
export const REWARD_POINTS_REPORT = {
  SUMMARY: () => `/api/report/reward-points`,
} as const;

// Independent E-Wallet reporting API — reads clients directly, never through
// the Appointment API. Mounted at /api/report. Row-click drill-down keeps
// using the existing EWALLET.BREAKDOWN/LEDGER endpoints (already independent).
export const EWALLET_REPORT = {
  SUMMARY: () => `/api/report/ewallet`,
} as const;

// Independent Client Revenue reporting API — reads sales/clients directly,
// never through the Appointment API. Mounted at /api/report.
export const CLIENT_REVENUE_REPORT = {
  SUMMARY: () => `/api/report/client-revenue`,
} as const;

// Independent Customer Frequency reporting API — reads clients/sales
// directly, never through the Appointment API. Mounted at /api/report.
export const CUSTOMER_FREQUENCY_REPORT = {
  SUMMARY: () => `/api/report/customer-frequency`,
} as const;

// Independent Staff Sales reporting API — reads sale_items/sales directly,
// never through the Appointment API. Mounted at /api/report.
export const STAFF_SALES_REPORT = {
  SUMMARY: () => `/api/report/staff-sales`,
} as const;

// Independent Staff Performance reporting API — one row per staff member,
// reads sales/sale_items directly, never through the Appointment API.
// Mounted at /api/report.
export const STAFF_PERFORMANCE_REPORT = {
  SUMMARY: () => `/api/report/staff-performance`,
} as const;

// Independent Staff Item Sales reporting API — reads sale_items directly,
// never through the Appointment API. Mounted at /api/report.
export const STAFF_ITEM_SALES_REPORT = {
  SUMMARY: () => `/api/report/staff-item-sales`,
} as const;

// Independent Package Sale reporting API — reads client_packages directly.
// Mounted at /api/report.
export const PACKAGE_SALE_REPORT = {
  SUMMARY: () => `/api/report/package-sale`,
} as const;

// Independent Package History reporting API — reads
// client_package_session_history directly. Mounted at /api/report.
export const PACKAGE_HISTORY_REPORT = {
  SUMMARY: () => `/api/report/package-history`,
} as const;

// Independent Member Sale reporting API — reads client_memberships
// directly. Mounted at /api/report.
export const MEMBER_SALE_REPORT = {
  SUMMARY: () => `/api/report/member-sale`,
} as const;

// Independent Appointment Detail reporting API — reads the appointments
// table directly via SQL, never through the Appointment HTTP API/service.
// Mounted at /api/report.
export const APPOINTMENT_DETAIL_REPORT = {
  SUMMARY: () => `/api/report/appointment-detail`,
} as const;

// Independent WA Marketing Campaign reporting API — reads wa_campaigns
// directly, never through the campaigns HTTP API/service. Mounted at
// /api/report.
export const WA_CAMPAIGN_REPORT = {
  SUMMARY: () => `/api/report/wa-campaign`,
} as const;

// Independent Client Rating reporting API — reads the reviews table
// directly, never through the reviews module's own /api/v1/reviews API.
// Mounted at /api/report.
export const CLIENT_RATING_REPORT = {
  SUMMARY: () => `/api/report/client-rating`,
} as const;
