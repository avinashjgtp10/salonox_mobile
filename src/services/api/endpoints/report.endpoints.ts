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
  CHART: () => `/api/report/sales-summary/chart`,
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
  CHART: () => `/api/report/product-retail/chart`,
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
  CHART: () => `/api/report/product-inventory/chart`,
} as const;

// Independent Slow Moving Products reporting API — products with low/no
// sales within a selected date range, reads products/sale_items/sales
// directly, never through the Appointment API. Mounted at /api/report.
export const SLOW_MOVING_PRODUCTS_REPORT = {
  SUMMARY: () => `/api/report/slow-moving-products`,
} as const;

// Independent Fast Moving Products reporting API — products with the
// highest sales volume within a selected date range. Shares its backend
// query with SLOW_MOVING_PRODUCTS_REPORT, sorted the opposite way by
// default. Mounted at /api/report.
export const FAST_MOVING_PRODUCTS_REPORT = {
  SUMMARY: () => `/api/report/fast-moving-products`,
} as const;

export const BRAND_PERFORMANCE_REPORT = {
  SUMMARY: () => `/api/report/brand-performance`,
} as const;

export const PURCHASE_VS_SALES_REPORT = {
  SUMMARY: () => `/api/report/purchase-vs-sales`,
} as const;

// Independent Stock Movement reporting API — one row per product per day it
// moved, with opening/in/out/closing balances. Reads stock_ledger directly,
// never through the operational Stock Ledger API. Mounted at /api/report.
export const STOCK_MOVEMENT_REPORT = {
  SUMMARY: () => `/api/report/stock-movement`,
} as const;

// Independent Service Sale reporting API — reads sales/sale_items directly,
// never through the Appointment API. Mounted at /api/report.
export const SERVICE_SALE_REPORT = {
  SUMMARY: () => `/api/report/service-sale`,
  CHART: () => `/api/report/service-sale/chart`,
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
  CHART: () => `/api/report/client-revenue/chart`,
} as const;

// Independent All Clients reporting API — pure client-profile listing (no
// revenue/visit figures), reads clients directly, never through the
// Appointment API. Mounted at /api/report.
export const ALL_CLIENTS_REPORT = {
  SUMMARY: () => `/api/report/all-clients`,
} as const;

// Independent Customer Frequency reporting API — reads clients/sales
// directly, never through the Appointment API. Mounted at /api/report.
export const CUSTOMER_FREQUENCY_REPORT = {
  SUMMARY: () => `/api/report/customer-frequency`,
  CHART: () => `/api/report/customer-frequency/chart`,
} as const;

// Independent New Client Follow-Up reporting API — clients who joined within
// the trailing window and have no completed appointment yet. Mounted at
// /api/report.
export const NEW_CLIENT_FOLLOW_UP_REPORT = {
  SUMMARY: () => `/api/report/new-client-follow-up`,
} as const;

// Independent Cancellation Recovery reporting API — clients whose most
// recent appointment was cancelled within the trailing window, with no
// rebooking since. Mounted at /api/report.
export const CANCELLATION_RECOVERY_REPORT = {
  SUMMARY: () => `/api/report/cancellation-recovery`,
} as const;

// Independent Membership Opportunity reporting API — frequent visitors with
// no currently active membership. Mounted at /api/report.
export const MEMBERSHIP_OPPORTUNITY_REPORT = {
  SUMMARY: () => `/api/report/membership-opportunity`,
} as const;

// Independent No-Show Recovery reporting API — no-show appointments within
// the filtered window. Mounted at /api/report.
export const NO_SHOW_RECOVERY_REPORT = {
  SUMMARY: () => `/api/report/no-show-recovery`,
} as const;

// Independent Enquiry reporting API — reads the enquiries table directly
// (same data the Add Enquiry form / EnquiriesListPage already manage), with
// richer filters and KPI stats. Mounted at /api/report.
export const ENQUIRY_REPORT = {
  SUMMARY: () => `/api/report/enquiries`,
  CHART: () => `/api/report/enquiries/chart`,
} as const;

// Independent Lost Customers reporting API — standalone report, separate
// from Customer Frequency's fixed 90-day "lost" bucket; reads clients/sales
// directly, never through the Appointment API. Mounted at /api/report.
export const LOST_CUSTOMERS_REPORT = {
  SUMMARY: () => `/api/report/lost-customers`,
} as const;

// Independent Customer Spend Segments reporting API — classifies clients
// VIP / Regular / Low against owner-set ₹ thresholds, with per-segment counts
// and VIP revenue share. Reads clients/sales directly, never through the
// Appointment API. Mounted at /api/report.
export const CUSTOMER_SPEND_REPORT = {
  SUMMARY: () => `/api/report/customer-spend`,
} as const;

// Independent Service Frequency reporting API — one row per client+service
// pair (visits, first/last visit, average gap). Reads sale_items/sales/
// clients directly, never through the Appointment API. Mounted at
// /api/report.
export const SERVICE_FREQUENCY_REPORT = {
  SUMMARY: () => `/api/report/service-frequency`,
  CHART: () => `/api/report/service-frequency/chart`,
} as const;

// Independent Membership History reporting API — one row per membership
// benefit redemption, read from membership_usage_log (the membership
// counterpart to Package History). Mounted at /api/report.
export const MEMBERSHIP_HISTORY_REPORT = {
  SUMMARY: () => `/api/report/membership-history`,
} as const;

// Independent Payment Collection reporting API — one row per billed
// appointment (billed / collected / still due). Reads appointments+payments
// directly, never sales: an unpaid bill has no sales row at all, and payments
// links by appointment_id (there is no sale_id). Mounted at /api/report.
export const PAYMENT_COLLECTION_REPORT = {
  SUMMARY: () => `/api/report/payment-collection`,
  CHART: () => `/api/report/payment-collection/chart`,
} as const;

// Independent Pending Payment reporting API — one row per bill still carrying
// a due balance (partial or unpaid). Reads appointments+payments directly,
// never sales: an unpaid bill has no sales row at all, and payments links by
// appointment_id (there is no sale_id). Mounted at /api/report.
export const PENDING_PAYMENT_REPORT = {
  SUMMARY: () => `/api/report/pending-payment`,
} as const;

// Independent Cash Management reporting API — one row per cash counter
// session. Reads cash_management directly, never the cash-management
// module's own operational API. Mounted at /api/report.
export const CASH_MANAGEMENT_REPORT = {
  SUMMARY: () => `/api/report/cash-management`,
  CHART: () => `/api/report/cash-management/chart`,
} as const;

// Independent Referral reporting API — one row per referred client, joined
// back to the referrer, with reward amounts read from referral_ledger. Reads
// clients/sales/referral_ledger directly, never through the Appointment API.
// Mounted at /api/report.
export const REFERRAL_REPORT = {
  SUMMARY: () => `/api/report/referral`,
} as const;

// Independent Staff Sales reporting API — reads sale_items/sales directly,
// never through the Appointment API. Mounted at /api/report.
export const STAFF_SALES_REPORT = {
  SUMMARY: () => `/api/report/staff-sales`,
  CHART: () => `/api/report/staff-sales/chart`,
} as const;

// Independent Staff Performance reporting API — one row per staff member,
// reads sales/sale_items directly, never through the Appointment API.
// Mounted at /api/report.
export const STAFF_PERFORMANCE_REPORT = {
  SUMMARY: () => `/api/report/staff-performance`,
  CHART: () => `/api/report/staff-performance/chart`,
} as const;

// Independent Staff Item Sales reporting API — reads sale_items directly,
// never through the Appointment API. Mounted at /api/report.
export const STAFF_ITEM_SALES_REPORT = {
  SUMMARY: () => `/api/report/staff-item-sales`,
  CHART: () => `/api/report/staff-item-sales/chart`,
} as const;

// Independent Rebooking Rate reporting API — one row per staff member,
// measuring what share of their served visits led to the client returning
// within a manually-entered day window. Reads sales/sale_items/clients
// directly, never through the Appointment API. Mounted at /api/report.
export const REBOOKING_RATE_REPORT = {
  SUMMARY: () => `/api/report/rebooking-rate`,
} as const;

// Independent Package Sale reporting API — reads client_packages directly.
// Mounted at /api/report.
export const PACKAGE_SALE_REPORT = {
  SUMMARY: () => `/api/report/package-sale`,
  CHART: () => `/api/report/package-sale/chart`,
} as const;

// Independent Payroll History reporting API — reads payroll_entries
// directly. Mounted at /api/report.
export const PAYROLL_HISTORY_REPORT = {
  SUMMARY: () => `/api/report/payroll-history`,
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
  CHART: () => `/api/report/member-sale/chart`,
} as const;

// Independent Appointment Detail reporting API — reads the appointments
// table directly via SQL, never through the Appointment HTTP API/service.
// Mounted at /api/report.
export const APPOINTMENT_DETAIL_REPORT = {
  SUMMARY: () => `/api/report/appointment-detail`,
} as const;

// Independent Upcoming Appointments reporting API — reads the appointments
// table directly via SQL, never through the Appointment HTTP API/service.
// Scoped server-side to future, still-booked appointments. Mounted at
// /api/report.
export const UPCOMING_APPOINTMENTS_REPORT = {
  SUMMARY: () => `/api/report/upcoming-appointments`,
} as const;

// Independent WA Marketing Campaign reporting API — reads wa_campaigns
// directly, never through the campaigns HTTP API/service. Mounted at
// /api/report.
export const WA_CAMPAIGN_REPORT = {
  SUMMARY: () => `/api/report/wa-campaign`,
} as const;

// Independent Open Rate reporting API — campaign engagement (opened ÷
// delivered), sharing WA_CAMPAIGN_REPORT's underlying state definitions on
// the backend so the two reports can never disagree. Mounted at /api/report.
export const OPEN_RATE_REPORT = {
  SUMMARY: () => `/api/report/open-rate`,
  CAMPAIGN_DETAIL: () => `/api/report/open-rate/campaign`,
} as const;

// Independent Reply Rate reporting API — how many recipients wrote back
// within 24h of a campaign reaching them. Same campaign set and filters as
// OPEN_RATE_REPORT. Mounted at /api/report.
export const REPLY_RATE_REPORT = {
  SUMMARY: () => `/api/report/reply-rate`,
  CAMPAIGN_DETAIL: () => `/api/report/reply-rate/campaign`,
} as const;

// Independent Birthday Campaign Performance reporting API — reads
// wa_automation_logs directly (event_type = 'birthday_wishes'), never
// through the whatsapp-automation module's own API. One row per message
// send, not per-campaign — birthday wishes have no campaign grouping.
// Mounted at /api/report.
export const BIRTHDAY_CAMPAIGN_REPORT = {
  SUMMARY: () => `/api/report/birthday-campaign`,
} as const;

// Independent Client Rating reporting API — reads the reviews table
// directly, never through the reviews module's own /api/v1/reviews API.
// Mounted at /api/report.
export const CLIENT_RATING_REPORT = {
  SUMMARY: () => `/api/report/client-rating`,
} as const;
