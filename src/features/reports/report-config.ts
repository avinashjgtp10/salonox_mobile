import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type ReportSlug =
  | "sales-summary"
  | "daily-sheet"
  | "product-retail"
  | "service-sale"
  | "gst-report"
  | "product-margin"
  | "reward"
  | "ewallet"
  | "payment-collection"
  | "cash-management"
  | "client-revenue"
  | "customer-frequency"
  | "lost-customers"
  | "vip-customers"
  | "service-frequency"
  | "referral-report"
  | "client-rating"
  | "staff-sales"
  | "staff-performance"
  | "staff-item-sales"
  | "commission-report"
  | "attendance-report"
  | "payroll-history"
  | "rebooking-rate"
  | "appointment-detail"
  | "upcoming-appointments"
  | "product-inventory"
  | "consumable-usage"
  | "supplier-report"
  | "package-sale"
  | "package-history"
  | "member-sale"
  | "membership-history"
  | "wa-marketing-campaign"
  | "marketing-feedback"
  | "open-rate"
  | "reply-rate";

export type ReportGroup =
  | "Sales"
  | "Payments"
  | "Customers"
  | "Staff"
  | "Appointments"
  | "Inventory"
  | "Package & Membership"
  | "Marketing";

export type ReportFilterKey =
  | "start_date"
  | "end_date"
  | "date"
  | "staff_id"
  | "staff_ids"
  | "client_ids"
  | "service_ids"
  | "category_ids"
  | "package_ids"
  | "membership_names"
  | "benefit_types"
  | "pricing_types"
  | "payment_statuses"
  | "payment_methods"
  | "segments"
  | "appointment_types"
  | "vip_min_spend"
  | "low_max_spend"
  | "status"
  | "category_id"
  | "search"
  | "service_id"
  | "product_id"
  | "period"
  | "item_type"
  | "from"
  | "to"
  | "statuses"
  | "branch_id"
  | "campaign_id"
  | "report_type"
  | "customer_type"
  | "lost_days"
  | "min_rating"
  | "brand_id"
  | "stock_status"
  | "engagement_bucket"
  | "include_trend";

export type ReportFilters = Partial<Record<ReportFilterKey, string>> & {
  page?: number;
  limit?: number;
};

type ReportAvailability = "available" | "unavailable";

export type ReportConfig = {
  emptyMessage: string;
  // Every report is a POST /api/report/* route except "consumable-usage",
  // whose one legacy exception (/inventory/stock-reconciliation) mirrors
  // exactly what the Web app still calls — see report.thunk.ts's
  // special-cased fetch and types/report.ts for the full rationale. Do not
  // widen this further; new reports should get a real /api/report/* route.
  endpoint?: `/api/report/${string}` | "/inventory/stock-reconciliation";
  exportSupported: boolean;
  filters: ReportFilterKey[];
  group: ReportGroup;
  icon: ComponentProps<typeof Ionicons>["name"];
  paginated: boolean;
  permission: "view_reports";
  primaryFields: string[];
  slug: ReportSlug;
  status: ReportAvailability;
  statusReason?: string;
  subtitle: string;
  title: string;
};

const available = (
  config: Omit<ReportConfig, "exportSupported" | "permission" | "status">,
): ReportConfig => ({
  ...config,
  exportSupported: false,
  permission: "view_reports",
  status: "available",
});

const unavailable = (
  config: Omit<ReportConfig, "endpoint" | "exportSupported" | "permission" | "status">,
): ReportConfig => ({
  ...config,
  exportSupported: false,
  permission: "view_reports",
  status: "unavailable",
});

export const REPORT_CONFIGS: ReportConfig[] = [
  available({ slug: "sales-summary", title: "Sales Summary", subtitle: "View every bill raised for a period - totals, payments, balances and status.", group: "Sales", icon: "analytics-outline", endpoint: "/api/report/sales-summary", filters: ["start_date", "end_date", "staff_id", "status", "category_id", "search"], paginated: true, primaryFields: ["invoiceNumber", "clientName", "price", "status"], emptyMessage: "No sales found" }),
  available({ slug: "daily-sheet", title: "Daily Sheet", subtitle: "A single day's transactions - tickets, services, staff and collections.", group: "Sales", icon: "calendar-outline", endpoint: "/api/report/daily-sheet", filters: ["date", "staff_id", "service_id", "search"], paginated: true, primaryFields: ["ticketNo", "clientName", "service", "amount"], emptyMessage: "No daily transactions found" }),
  available({ slug: "product-retail", title: "Product Retail", subtitle: "Products sold directly to clients.", group: "Sales", icon: "bag-handle-outline", endpoint: "/api/report/product-retail", filters: ["start_date", "end_date", "product_id", "search"], paginated: true, primaryFields: ["productName", "clientName", "quantity", "total"], emptyMessage: "No product sales found" }),
  available({ slug: "service-sale", title: "Service Sale", subtitle: "Every service sold, with revenue and staff/client detail.", group: "Sales", icon: "cut-outline", endpoint: "/api/report/service-sale", filters: ["start_date", "end_date", "staff_id", "search"], paginated: true, primaryFields: ["serviceName", "staffName", "clientName", "price"], emptyMessage: "No service sales found" }),
  available({ slug: "gst-report", title: "GST Report", subtitle: "Tax collected per invoice.", group: "Sales", icon: "document-text-outline", endpoint: "/api/report/gst", filters: ["start_date", "end_date", "staff_id", "search"], paginated: true, primaryFields: ["invoiceNo", "clientName", "taxableAmount", "taxAmount"], emptyMessage: "No GST records found" }),
  available({ slug: "product-margin", title: "Product Margin", subtitle: "Profit margin per product.", group: "Sales", icon: "trending-up-outline", endpoint: "/api/report/product-margin", filters: ["start_date", "end_date"], paginated: true, primaryFields: ["productName", "quantity", "profit", "marginPct"], emptyMessage: "No product margins found" }),
  available({ slug: "reward", title: "Reward", subtitle: "Reward points available and redeemed to date, per client.", group: "Sales", icon: "gift-outline", endpoint: "/api/report/reward-points", filters: ["search"], paginated: true, primaryFields: ["clientName", "pointsAvailable", "pointsEarned", "pointsRedeemed"], emptyMessage: "No reward points found" }),
  available({ slug: "ewallet", title: "E-Wallet", subtitle: "Client e-wallet balances.", group: "Sales", icon: "wallet-outline", endpoint: "/api/report/ewallet", filters: ["search"], paginated: true, primaryFields: ["clientName", "phone", "balance", "email"], emptyMessage: "No wallet balances found" }),

  available({ slug: "payment-collection", title: "Payment Collection Report", subtitle: "Outstanding balances per bill.", group: "Payments", icon: "cash-outline", endpoint: "/api/report/payment-collection", filters: ["start_date", "end_date", "staff_ids", "payment_statuses", "payment_methods", "search"], paginated: true, primaryFields: ["invoiceNumber", "customerName", "contact", "totalAmount", "paidAmount", "dueAmount", "paymentMethod", "paymentStatus", "staffName", "paymentDate"], emptyMessage: "No payment collection records" }),
  unavailable({ slug: "cash-management", title: "Cash Management Report", subtitle: "Live POS cash management is a separate module.", group: "Payments", icon: "receipt-outline", filters: ["date"], paginated: false, primaryFields: ["label", "amount"], emptyMessage: "No cash management data", statusReason: "Separate live POS/Cash Management feature, not a Reports API route." }),

  available({ slug: "client-revenue", title: "Client Revenue", subtitle: "Total spend, visit count and average ticket per client.", group: "Customers", icon: "people-outline", endpoint: "/api/report/client-revenue", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["clientName", "visits", "totalSpend", "lastVisit"], emptyMessage: "No client revenue found" }),
  available({ slug: "customer-frequency", title: "Customer Frequency", subtitle: "New, returning, frequent and lost customer analysis.", group: "Customers", icon: "repeat-outline", endpoint: "/api/report/customer-frequency", filters: ["start_date", "end_date", "search", "customer_type"], paginated: true, primaryFields: ["clientName", "visits", "totalSpend", "lastVisit"], emptyMessage: "No customer frequency records found" }),
  available({ slug: "lost-customers", title: "Lost Customers", subtitle: "Clients who stopped visiting within your chosen inactivity window.", group: "Customers", icon: "person-remove-outline", endpoint: "/api/report/lost-customers", filters: ["start_date", "end_date", "search", "lost_days"], paginated: true, primaryFields: ["clientName", "lastVisit", "daysSinceLastVisit", "totalSpend"], emptyMessage: "No lost customers found" }),
  available({ slug: "vip-customers", title: "VIP Customers", subtitle: "Top spending customers by configurable thresholds.", group: "Customers", icon: "star-outline", endpoint: "/api/report/customer-spend", filters: ["start_date", "end_date", "vip_min_spend", "low_max_spend", "segments", "staff_ids", "search"], paginated: true, primaryFields: ["clientName", "contact", "spendSegment", "visits", "totalSpend", "avgTicket", "firstVisit", "lastVisit", "daysSinceLastVisit"], emptyMessage: "No VIP customers found" }),
  available({ slug: "service-frequency", title: "Service Frequency", subtitle: "How often each client returns for a given service.", group: "Customers", icon: "cut-outline", endpoint: "/api/report/service-frequency", filters: ["start_date", "end_date", "service_ids", "category_ids", "staff_ids", "search"], paginated: true, primaryFields: ["clientName", "contact", "serviceName", "categoryName", "visits", "totalSpend", "firstVisit", "lastVisit", "daysSinceLastVisit"], emptyMessage: "No service frequency records" }),
  available({ slug: "referral-report", title: "Referral Report", subtitle: "Who referred whom, visits, revenue and reward status.", group: "Customers", icon: "people-circle-outline", endpoint: "/api/report/referral", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["referredClientName", "referrerName", "visits", "totalSpend"], emptyMessage: "No referral records found" }),
  available({ slug: "client-rating", title: "Client Rating Report", subtitle: "Post-visit ratings, reviews per client and spend.", group: "Customers", icon: "star-half-outline", endpoint: "/api/report/client-rating", filters: ["start_date", "end_date", "search", "min_rating"], paginated: true, primaryFields: ["clientName", "rating", "staffName", "reviewDate"], emptyMessage: "No client ratings found" }),

  available({ slug: "staff-sales", title: "Staff Sales", subtitle: "Revenue generated by each staff member.", group: "Staff", icon: "bar-chart-outline", endpoint: "/api/report/staff-sales", filters: ["start_date", "end_date", "period", "staff_id"], paginated: false, primaryFields: ["staffName", "itemDescription", "price", "status"], emptyMessage: "No staff sales found" }),
  available({ slug: "staff-performance", title: "Staff Performance", subtitle: "Invoices, items sold, revenue, commission, collected and due.", group: "Staff", icon: "speedometer-outline", endpoint: "/api/report/staff-performance", filters: ["start_date", "end_date", "staff_ids", "search"], paginated: true, primaryFields: ["staffName", "invoiceCount", "totalRevenue", "commission"], emptyMessage: "No staff performance records found" }),
  available({ slug: "staff-item-sales", title: "Service, Product, Membership & Package Sold by Staff", subtitle: "What each staff member sold, by item type.", group: "Staff", icon: "list-outline", endpoint: "/api/report/staff-item-sales", filters: ["start_date", "end_date", "item_type", "staff_id"], paginated: true, primaryFields: ["staffName", "itemName", "quantity", "revenue"], emptyMessage: "No staff item sales found" }),
  unavailable({ slug: "commission-report", title: "Commission Report", subtitle: "Commission earned by each staff member for a month.", group: "Staff", icon: "cash-outline", filters: ["start_date", "end_date"], paginated: false, primaryFields: ["staffFirstName", "totalRevenue", "totalEarned", "pendingPayout"], emptyMessage: "No commissions available", statusReason: "Current backend exposes commission under /staff/commissions, not verified as POST /api/report/*." }),
  unavailable({ slug: "attendance-report", title: "Attendance Report", subtitle: "Daily attendance for every staff member.", group: "Staff", icon: "time-outline", filters: ["start_date", "end_date"], paginated: false, primaryFields: ["staffName", "date", "status", "hoursWorked"], emptyMessage: "No attendance records", statusReason: "Current backend exposes attendance under /attendance/range, not verified as POST /api/report/*." }),
  unavailable({ slug: "payroll-history", title: "Payroll History Report", subtitle: "Payroll run history and payouts.", group: "Staff", icon: "card-outline", filters: ["start_date", "end_date"], paginated: true, primaryFields: ["staffName", "period", "netPay", "status"], emptyMessage: "No payroll history found", statusReason: "No backend implementation found." }),
  unavailable({ slug: "rebooking-rate", title: "Rebooking Rate Report", subtitle: "Rebooking performance by staff and period.", group: "Staff", icon: "refresh-outline", filters: ["start_date", "end_date", "staff_id"], paginated: true, primaryFields: ["staffName", "appointments", "rebooked", "rebookingRate"], emptyMessage: "No rebooking data found", statusReason: "No backend implementation found." }),

  available({ slug: "appointment-detail", title: "Detailed Appointment Reports", subtitle: "Every appointment for a period.", group: "Appointments", icon: "calendar-number-outline", endpoint: "/api/report/appointment-detail", filters: ["from", "to", "statuses"], paginated: true, primaryFields: ["clientName", "serviceName", "appointmentDate", "paymentStatus"], emptyMessage: "No appointments found" }),
  available({ slug: "upcoming-appointments", title: "Upcoming Appointments Report", subtitle: "Future appointments still booked.", group: "Appointments", icon: "alarm-outline", endpoint: "/api/report/upcoming-appointments", filters: ["from", "to", "client_ids", "staff_ids", "service_ids", "package_ids", "statuses", "appointment_types", "search"], paginated: true, primaryFields: ["appointmentDate", "time", "clientName", "mobileNumber", "serviceName", "packageName", "staffName", "appointmentStatus", "appointmentType", "description"], emptyMessage: "No upcoming appointments found" }),

  available({ slug: "product-inventory", title: "Product Inventory", subtitle: "Current on-hand stock, reorder levels and stock value.", group: "Inventory", icon: "layers-outline", endpoint: "/api/report/product-inventory", filters: ["start_date", "end_date", "category_id", "search"], paginated: true, primaryFields: ["productName", "currentStock", "salesRevenue", "status"], emptyMessage: "No inventory products found" }),
  // Web-parity legacy report: mirrors the Web app's ConsumableUsageReport.tsx
  // exactly, calling GET /inventory/stock-reconciliation (branch_id only) —
  // there is no POST /api/report/consumable-usage route to migrate to. All
  // totals are all-time (no date range); search/category filtering and
  // pagination happen client-side against the single full response, so this
  // report is routed to a dedicated screen rather than the generic one — see
  // src/app/reports/[slug].tsx.
  available({ slug: "consumable-usage", title: "Consumable Usage", subtitle: "Products used by staff during services — all-time totals.", group: "Inventory", icon: "flask-outline", endpoint: "/inventory/stock-reconciliation", filters: ["search", "category_id"], paginated: false, primaryFields: ["itemName", "categoryName", "actualConsumable", "adjustConsumable", "consumableDifference", "unit", "remark"], emptyMessage: "No consumable usage found" }),
  unavailable({ slug: "supplier-report", title: "Supplier Report", subtitle: "Suppliers, contact details and location.", group: "Inventory", icon: "business-outline", filters: ["search"], paginated: true, primaryFields: ["name", "phone", "email", "city"], emptyMessage: "No suppliers found", statusReason: "Supplier API exists under /inventory/suppliers, not as POST /api/report/*." }),

  available({ slug: "package-sale", title: "Package Sale", subtitle: "Packages purchased by clients.", group: "Package & Membership", icon: "cube-outline", endpoint: "/api/report/package-sale", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["packageName", "clientName", "totalAmount", "paymentStatus"], emptyMessage: "No package sales found" }),
  available({ slug: "package-history", title: "Package History", subtitle: "Session-by-session package usage history.", group: "Package & Membership", icon: "time-outline", endpoint: "/api/report/package-history", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["packageName", "clientName", "serviceName", "status"], emptyMessage: "No package history found" }),
  available({ slug: "member-sale", title: "Membership Sale", subtitle: "Memberships purchased by clients.", group: "Package & Membership", icon: "diamond-outline", endpoint: "/api/report/member-sale", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["membershipName", "clientName", "pricePaid", "status"], emptyMessage: "No membership sales found" }),
  available({ slug: "membership-history", title: "Membership History", subtitle: "Redemption-by-redemption membership usage.", group: "Package & Membership", icon: "reader-outline", endpoint: "/api/report/membership-history", filters: ["start_date", "end_date", "membership_names", "benefit_types", "pricing_types", "statuses", "staff_ids", "search"], paginated: true, primaryFields: ["date", "clientName", "membershipName", "membershipType", "serviceName", "benefitType", "amountDeducted", "remainingBalance", "sessionsConsumed", "staff", "expiryDate", "status"], emptyMessage: "No membership history found" }),

  available({ slug: "wa-marketing-campaign", title: "WA Marketing Campaign", subtitle: "WhatsApp campaign delivery, read rates and engagement.", group: "Marketing", icon: "logo-whatsapp", endpoint: "/api/report/wa-campaign", filters: ["start_date", "end_date", "search", "engagement_bucket"], paginated: true, primaryFields: ["name", "status", "sent", "openRate"], emptyMessage: "No WhatsApp campaigns found" }),
  available({ slug: "marketing-feedback", title: "Marketing Feedback & Ratings", subtitle: "Post-visit WhatsApp feedback ratings and reviews.", group: "Marketing", icon: "chatbox-ellipses-outline", endpoint: "/api/report/client-rating", filters: ["start_date", "end_date", "search", "min_rating"], paginated: true, primaryFields: ["clientName", "rating", "reviewText", "reviewDate"], emptyMessage: "No marketing feedback found" }),
  available({ slug: "open-rate", title: "Open Rate Report", subtitle: "Campaign opens divided by delivered messages.", group: "Marketing", icon: "mail-open-outline", endpoint: "/api/report/open-rate", filters: ["start_date", "end_date", "campaign_id", "search", "include_trend"], paginated: true, primaryFields: ["name", "sent", "delivered", "openRate"], emptyMessage: "No open-rate campaigns found" }),
  available({ slug: "reply-rate", title: "Reply Rate Report", subtitle: "Replies within 24 hours of campaign delivery.", group: "Marketing", icon: "chatbubbles-outline", endpoint: "/api/report/reply-rate", filters: ["start_date", "end_date", "campaign_id", "search"], paginated: true, primaryFields: ["name", "sent", "replied", "replyRate"], emptyMessage: "No reply-rate campaigns found" }),
];

export const REPORT_GROUPS: ReportGroup[] = [
  "Sales",
  "Payments",
  "Customers",
  "Staff",
  "Appointments",
  "Inventory",
  "Package & Membership",
  "Marketing",
];

export const MOBILE_DAILY_REPORT_SLUGS = [
  "sales-summary",
  "daily-sheet",
  "staff-sales",
  "appointment-detail",
  "service-sale",
  "product-retail",
  "product-inventory",
  "ewallet",
  "consumable-usage",
] as const satisfies readonly ReportSlug[];

const mobileDailyReportSlugSet = new Set<ReportSlug>(MOBILE_DAILY_REPORT_SLUGS);

export const VISIBLE_REPORT_CONFIGS = REPORT_CONFIGS.filter((config) =>
  mobileDailyReportSlugSet.has(config.slug),
);

export const VISIBLE_REPORT_GROUPS = REPORT_GROUPS.filter((group) =>
  VISIBLE_REPORT_CONFIGS.some((config) => config.group === group),
);

export const getReportConfig = (slug: string) =>
  REPORT_CONFIGS.find((config) => config.slug === slug);

export const createDefaultReportFilters = (slug: ReportSlug): ReportFilters => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  const date = (value: Date) => value.toISOString().slice(0, 10);
  const base = { start_date: date(start), end_date: date(today), page: 1, limit: 20 };

  if (slug === "daily-sheet") return { date: date(today), page: 1, limit: 20 };
  if (slug === "appointment-detail" || slug === "upcoming-appointments") {
    return { from: date(start), to: date(today), page: 1, limit: 20 };
  }
  if (slug === "reward" || slug === "ewallet" || slug === "supplier-report") {
    return { page: 1, limit: 20 };
  }
  if (slug === "staff-sales") return { ...base, period: "daily" };
  if (slug === "staff-item-sales") return { ...base, item_type: "service" };
  if (slug === "lost-customers") return { ...base, lost_days: "90" };
  if (slug === "vip-customers") return { ...base, vip_min_spend: "25000", low_max_spend: "2000" };
  return base;
};
