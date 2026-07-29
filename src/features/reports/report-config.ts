import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type ReportSlug =
  | "sales-summary" | "daily-sheet" | "gst" | "client-revenue"
  | "appointment-detail"
  | "service-sale" | "product-retail" | "product-margin"
  | "staff-sales" | "staff-item-sales" | "attendance" | "commission"
  | "package-sale" | "package-history" | "member-sale" | "reward-points"
  | "e-wallet" | "product-inventory" | "whatsapp-campaign";

export type ReportGroup = "Business" | "Services" | "Staff" | "Membership" | "Inventory" | "Marketing";
export type ReportFilterKey =
  | "start_date" | "end_date" | "date" | "staff_id" | "status"
  | "category_id" | "search" | "service_id" | "product_id" | "period"
  | "item_type" | "from" | "to" | "statuses" | "branch_id"
  | "campaign_id" | "report_type";

export type ReportFilters = Partial<Record<ReportFilterKey, string>> & {
  page?: number;
  limit?: number;
};

export type ReportConfig = {
  emptyMessage: string;
  filters: ReportFilterKey[];
  group: ReportGroup;
  icon: ComponentProps<typeof Ionicons>["name"];
  paginated: boolean;
  primaryFields: string[];
  slug: ReportSlug;
  subtitle: string;
  title: string;
};

export const REPORT_CONFIGS: ReportConfig[] = [
  { slug: "sales-summary", title: "Sales Summary", subtitle: "Revenue, payments and bill performance", group: "Business", icon: "analytics-outline", filters: ["start_date", "end_date", "staff_id", "status", "category_id", "search"], paginated: true, primaryFields: ["invoiceNumber", "clientName", "price", "status"], emptyMessage: "No sales found" },
  { slug: "daily-sheet", title: "Daily Sheet", subtitle: "A clear view of today’s transactions", group: "Business", icon: "calendar-outline", filters: ["date", "staff_id", "service_id", "search"], paginated: true, primaryFields: ["ticketNo", "clientName", "service", "amount"], emptyMessage: "No daily transactions found" },
  { slug: "gst", title: "GST", subtitle: "Taxable sales and tax collected", group: "Business", icon: "document-text-outline", filters: ["start_date", "end_date", "staff_id", "search"], paginated: true, primaryFields: ["invoiceNo", "clientName", "taxableAmount", "taxAmount"], emptyMessage: "No GST records found" },
  { slug: "client-revenue", title: "Client Revenue", subtitle: "Spend, visits and customer value", group: "Business", icon: "people-outline", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["clientName", "visits", "totalSpend", "lastVisit"], emptyMessage: "No client revenue found" },
  { slug: "appointment-detail", title: "Appointment Detail", subtitle: "Booking, service and payment details", group: "Business", icon: "calendar-number-outline", filters: ["from", "to", "statuses"], paginated: true, primaryFields: ["clientName", "serviceName", "appointmentDate", "paymentStatus"], emptyMessage: "No appointments found" },
  { slug: "service-sale", title: "Service Sale", subtitle: "Service revenue by team member", group: "Services", icon: "cut-outline", filters: ["start_date", "end_date", "staff_id", "search"], paginated: true, primaryFields: ["serviceName", "staffName", "clientName", "price"], emptyMessage: "No service sales found" },
  { slug: "product-retail", title: "Product Retail", subtitle: "Retail performance by product", group: "Services", icon: "bag-handle-outline", filters: ["start_date", "end_date", "product_id", "search"], paginated: true, primaryFields: ["productName", "clientName", "quantity", "total"], emptyMessage: "No product sales found" },
  { slug: "product-margin", title: "Product Margin", subtitle: "Revenue, cost and profitability", group: "Services", icon: "trending-up-outline", filters: ["start_date", "end_date"], paginated: true, primaryFields: ["productName", "quantity", "profit", "marginPct"], emptyMessage: "No product margins found" },
  { slug: "staff-sales", title: "Staff Sales", subtitle: "Team revenue over time", group: "Staff", icon: "bar-chart-outline", filters: ["start_date", "end_date", "period", "staff_id"], paginated: false, primaryFields: ["label", "serviceRevenue", "productRevenue", "total"], emptyMessage: "No staff sales found" },
  { slug: "staff-item-sales", title: "Staff Item Sales", subtitle: "Items sold by each team member", group: "Staff", icon: "list-outline", filters: ["start_date", "end_date", "item_type", "staff_id"], paginated: true, primaryFields: ["staffName", "itemName", "quantity", "revenue"], emptyMessage: "No staff item sales found" },
  { slug: "attendance", title: "Attendance", subtitle: "Team presence and working hours", group: "Staff", icon: "time-outline", filters: ["start_date", "end_date"], paginated: false, primaryFields: ["staffName", "date", "status", "hoursWorked"], emptyMessage: "No attendance records" },
  { slug: "commission", title: "Commission", subtitle: "Earnings, payouts and performance", group: "Staff", icon: "cash-outline", filters: ["start_date", "end_date"], paginated: false, primaryFields: ["staffFirstName", "totalRevenue", "totalEarned", "pendingPayout"], emptyMessage: "No commissions available" },
  { slug: "package-sale", title: "Package Sale", subtitle: "Package purchases and collections", group: "Membership", icon: "cube-outline", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["packageName", "clientName", "totalAmount", "paymentStatus"], emptyMessage: "No package sales found" },
  { slug: "package-history", title: "Package History", subtitle: "Package session usage history", group: "Membership", icon: "time-outline", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["packageName", "clientName", "serviceName", "status"], emptyMessage: "No package history found" },
  { slug: "member-sale", title: "Member Sale", subtitle: "Membership purchases and usage", group: "Membership", icon: "diamond-outline", filters: ["start_date", "end_date", "search"], paginated: true, primaryFields: ["membershipName", "clientName", "pricePaid", "status"], emptyMessage: "No membership sales found" },
  { slug: "reward-points", title: "Reward Points", subtitle: "Customer rewards and balances", group: "Membership", icon: "gift-outline", filters: ["search"], paginated: true, primaryFields: ["clientName", "pointsAvailable", "pointsEarned", "pointsRedeemed"], emptyMessage: "No reward points found" },
  { slug: "e-wallet", title: "E-Wallet", subtitle: "Wallet balances across clients", group: "Membership", icon: "wallet-outline", filters: ["search"], paginated: true, primaryFields: ["clientName", "phone", "balance", "email"], emptyMessage: "No wallet balances found" },
  { slug: "product-inventory", title: "Product Inventory", subtitle: "Stock, consumables and product sales", group: "Inventory", icon: "layers-outline", filters: ["branch_id", "start_date", "end_date", "category_id", "search"], paginated: false, primaryFields: ["itemName", "actualStock", "quantitySold", "salesRevenue"], emptyMessage: "No inventory products found" },
  { slug: "whatsapp-campaign", title: "WhatsApp Campaign", subtitle: "Campaign delivery and contact reports", group: "Marketing", icon: "logo-whatsapp", filters: ["campaign_id", "report_type"], paginated: false, primaryFields: ["name", "status", "sentCount", "readCount"], emptyMessage: "No WhatsApp campaigns found" },
];

export const REPORT_GROUPS: ReportGroup[] = ["Business", "Services", "Staff", "Membership", "Inventory", "Marketing"];
export const getReportConfig = (slug: string) => REPORT_CONFIGS.find((config) => config.slug === slug);

export const createDefaultReportFilters = (slug: ReportSlug): ReportFilters => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  const date = (value: Date) => value.toISOString().slice(0, 10);
  const base = { start_date: date(start), end_date: date(today), page: 1, limit: 20 };

  if (slug === "daily-sheet") return { date: date(today), page: 1, limit: 20 };
  if (slug === "appointment-detail") return { from: date(start), to: date(today), page: 1, limit: 20 };
  if (slug === "reward-points" || slug === "e-wallet" || slug === "whatsapp-campaign") return { page: 1, limit: 20 };
  if (slug === "staff-sales") return { ...base, period: "daily" };
  if (slug === "staff-item-sales") return { ...base, item_type: "service" };
  return base;
};
