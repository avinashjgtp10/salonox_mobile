import type { FilterOption } from "@/components/ui/FilterSheet";
import type { ReportFilterKey, ReportFilters, ReportSlug } from "./report-config";

export type ReportFilterDefinition = {
  key: ReportFilterKey;
  label: string;
  source?: string;
  options?: FilterOption[];
  single?: boolean;
  kind?: "number" | "date" | "boolean";
};
const options = (...ids: string[]): FilterOption[] => ids.map((id) => ({ id, label: id.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
const field = (key: ReportFilterKey, label: string, values: FilterOption[], single = false): ReportFilterDefinition => ({ key, label, options: values, single });
const source = (key: ReportFilterKey, label: string, name: string): ReportFilterDefinition => ({ key, label, source: name });
const staff = source("staff_ids", "Staff", "staff");
const category = source("category_ids", "Category", "categories");
const service = source("service_ids", "Service", "services");
const brand = source("brand_ids", "Brand", "brands");
const payment = source("payment_modes", "Payment Mode", "paymentModes");
const methods = field("payment_methods", "Payment Method", options("cash", "card", "upi", "wallet"));
const items = field("item_types", "Item Type", options("service", "product", "package", "membership"));
const paid = field("payment_statuses", "Payment Status", options("paid", "partial"));
const appt = field("statuses", "Appointment Status", options("booked", "paid", "partial", "cancelled", "no-show", "deleted"));
const gst: ReportFilterDefinition = { key: "include_gst", label: "Include GST", kind: "boolean" };
const membershipStatus = field("statuses", "Status", options("active", "expiry_soon", "expired", "complete"));
const pricing = field("pricing_types", "Membership Type", [{ id: "value", label: "Value (Wallet)" }, { id: "percentage", label: "Percentage" }, { id: "loyalty", label: "Loyalty (Visits)" }]);
const campaignStatus = [{ id: "DRAFT", label: "Draft" }, { id: "SCHEDULED", label: "Scheduled" }, { id: "SENDING", label: "Running" }, { id: "PAUSED", label: "Paused" }, { id: "COMPLETED", label: "Completed" }, { id: "FAILED", label: "Failed" }];
const campaign = [source("campaign_ids", "Campaign Name", "campaigns"), field("channels", "Campaign Type", [{ id: "whatsapp", label: "WhatsApp" }, { id: "sms", label: "SMS", disabled: true }, { id: "email", label: "Email", disabled: true }]), field("message_statuses", "Message Status", [{ id: "SENT", label: "Sent" }, { id: "DELIVERED", label: "Delivered" }, { id: "READ", label: "Opened" }, { id: "FAILED", label: "Failed" }, { id: "BLOCKED", label: "Blocked" }]), field("campaign_statuses", "Campaign Status", campaignStatus)];

// These keys and values match the web reports and reports.controller.ts.
export const REPORT_FILTER_FIELDS: Partial<Record<ReportSlug, ReportFilterDefinition[]>> = {
  "sales-summary": [staff, { ...category, label: "Service Category" }, payment, paid, { ...items, options: options("service", "product", "membership", "gift_card", "quick", "package") }, service, gst],
  "daily-sheet": [service, staff, payment, appt, items],
  "product-retail": [staff, brand, category],
  "service-sale": [category, service, staff, methods],
  "gst-report": [staff, items, methods],
  "product-margin": [brand, category],
  reward: [field("status", "Reward Status", [{ id: "active", label: "Active (has balance)" }, { id: "inactive", label: "Inactive (no balance)" }], true)],
  ewallet: [field("status", "Balance Status", options("with_balance", "no_balance"), true)],
  "payment-collection": [paid, source("payment_methods", "Payment Method", "paymentMethods"), staff],
  "client-revenue": [field("gender", "Gender", options("male", "female"), true), field("membership_status", "Membership Status", options("member", "non_member"), true), staff],
  "customer-frequency": [staff, field("customer_type", "Client Type", options("most_frequent", "least_frequent", "most_spending", "least_spending", "new", "old", "lost"), true)],
  "lost-customers": [staff, { key: "lost_days", label: "Days since last visit", kind: "number" }],
  "vip-customers": [field("segments", "Segment", [{ id: "vip", label: "VIP" }, { id: "regular", label: "Regular" }, { id: "low", label: "Low Spending" }]), staff, { key: "min_visits", label: "Minimum Visits", kind: "number" }],
  "service-frequency": [service, category, staff],
  "referral-report": [staff, field("reward_status", "Reward Status", options("rewarded", "pending"), true)],
  "client-rating": [staff, field("min_rating", "Rating", [5, 4, 3, 2, 1].map((n) => ({ id: String(n), label: `${n} Star` })), true)],
  "staff-sales": [staff, payment, items, field("payment_statuses", "Payment Status", options("paid", "booked", "cancelled", "refunded")), gst],
  "staff-performance": [staff, payment, field("payment_statuses", "Payment Status", [{ id: "completed", label: "Paid" }, ...options("partial", "cancelled", "refunded")]), items, source("package_ids", "Package", "packages"), source("membership_ids", "Membership", "memberships"), gst],
  "staff-item-sales": [staff, { ...items, key: "item_type", single: true }],
  "appointment-detail": [appt, field("payment_methods", "Payment Method", options("Cash", "Card", "UPI", "Wallet", "Membership", "Package")), staff],
  "upcoming-appointments": [source("client_ids", "Client", "clients"), staff, service, source("package_ids", "Package", "packages"), { ...appt, options: appt.options?.filter((o) => o.id !== "deleted") }, field("appointment_types", "Appointment Type", options("Regular", "Package Service", "Membership Service"))],
  "product-inventory": [category, brand, field("stock_status", "Stock Status", options("in_stock", "low_stock", "out_of_stock"), true), { key: "expiry_from", label: "Expiry from", kind: "date" }, { key: "expiry_to", label: "Expiry to", kind: "date" }],
  "consumable-usage": [source("category_ids", "Category", "categories")],
  "package-sale": [staff, source("package_names", "Package", "packages"), field("package_statuses", "Package Status", options("Active", "Completed")), field("payment_statuses", "Payment Status", options("Paid", "Partial", "Unpaid")), { ...methods, options: options("cash", "card", "upi", "net_banking", "split") }],
  "package-history": [source("package_names", "Package", "packages"), source("service_names", "Service", "services"), field("statuses", "Status", [{ id: "ongoing", label: "Active" }, { id: "expiring_soon", label: "Expiring Soon" }, { id: "expired", label: "Expired" }, { id: "complete", label: "Completed" }]), staff],
  "member-sale": [membershipStatus, source("membership_ids", "Membership", "memberships"), pricing, staff],
  "membership-history": [source("membership_names", "Membership", "memberships"), pricing, field("benefit_types", "Benefit Used", options("wallet", "discount", "loyalty")), membershipStatus, staff],
  "wa-marketing-campaign": [field("statuses", "Campaign Status", campaignStatus), source("template_ids", "Template", "templates"), ...(["delivery_bucket", "read_bucket"] as const).map((key) => field(key, key === "delivery_bucket" ? "Delivery Status" : "Read Status", [{ id: "high", label: "High (≥90%)" }, { id: "medium", label: "Medium (50–89%)" }, { id: "low", label: "Low (<50%)" }, { id: "none", label: "None" }], true))],
  "marketing-feedback": [staff, field("min_rating", "Rating", [5, 4, 3, 2, 1].map((n) => ({ id: String(n), label: `${n} Star` })), true)],
  "open-rate": campaign,
  "reply-rate": campaign,
};

export const decodeReportSelection = (value?: string): string[] => {
  if (!value) return [];
  if (value.startsWith("[")) {
    try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string"); } catch { /* Read older comma-separated selections below. */ }
  }
  return value.split(",").map((v) => v.trim()).filter(Boolean);
};

export const countReportFilters = (slug: ReportSlug, filters: ReportFilters) =>
  (REPORT_FILTER_FIELDS[slug] ?? []).reduce((count, field) => count + (field.kind === "boolean" ? Number(filters[field.key] === "false") : field.single || field.kind ? Number(Boolean(filters[field.key])) : decodeReportSelection(filters[field.key]).length), 0);
