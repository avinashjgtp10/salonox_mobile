import type { ReportFilters, ReportSlug } from "./report-config";
import type { GenericReportRequest } from "@/services/report.service";
import { REPORT_FILTER_FIELDS, decodeReportSelection } from "./report-filters";
import { getDateRangePreset } from "@/utils/dateRangePresets";

const cleanFilters = (filters: ReportFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined),
  ) as ReportFilters;

const ARRAY_FILTER_KEYS = new Set([
  "city", "country", "genders", "sources", "product_ids", "brand_ids", "payment_modes", "item_types", "membership_ids", "package_names",
  "service_names", "package_statuses", "template_ids", "campaign_ids", "channels",
  "message_statuses", "campaign_statuses",
  "appointment_types",
  "benefit_types",
  "category_ids",
  "client_ids",
  "membership_names",
  "package_ids",
  "payment_methods",
  "payment_statuses",
  "pricing_types",
  "segments",
  "service_ids",
  "staff_ids",
  "statuses",
]);

const splitArrayFilter = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  return decodeReportSelection(value);
};

const toNumberFilter = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

export const normalizeReportRequest = (slug: ReportSlug, filters: ReportFilters): GenericReportRequest => {
  const request: GenericReportRequest = { ...cleanFilters(filters) };
  if (slug === "gst-report" || slug === "non-gst-report") request.gst_mode = slug === "non-gst-report" ? "non_gst" : "gst";
  for (const field of REPORT_FILTER_FIELDS[slug] ?? []) {
    if ((field.multiSingle || field.firstSelected) && request[field.key] !== undefined) {
      const values = decodeReportSelection(String(request[field.key]));
      if (values.length === 1 || (field.firstSelected && values.length)) request[field.key] = values[0]; else delete request[field.key];
    }
  }
  for (const key of ["has_membership", "has_package"]) { if (request[key] === "true" || request[key] === "false") request[key] = request[key] === "true"; }

  if (slug === "new-client-follow-up" && request.new_within_days === undefined) request.new_within_days = 7;
  if (slug === "cancellation-recovery" && request.cancelled_within_days === undefined) request.cancelled_within_days = 30;
  if (slug === "rebooking-rate" && request.rebooking_days === undefined) request.rebooking_days = 45;
  if (slug === "membership-opportunity") { request.window_days ??= 90; request.min_visits ??= 0; }

  if (slug === "ewallet") {
    // Match web: this balance report accepts an as-of date, not a transaction range.
    const today = getDateRangePreset("today").endDate;
    const endDate = filters.end_date;
    request.as_of_date = endDate && endDate <= today ? endDate : today;
    delete request.start_date;
    delete request.end_date;
  }

  for (const key of ARRAY_FILTER_KEYS) {
    if (request[key] !== undefined) {
      request[key] = splitArrayFilter(request[key]);
    }
  }

  if (slug === "open-rate" && request.include_trend === "true") {
    request.include_trend = true;
  }
  if (request.include_gst !== undefined) request.include_gst = request.include_gst !== "false";
  for (const key of ["min_visits", "lost_days", "min_rating", "birth_month", "anniversary_month", "total_spend_min", "total_spend_max", "new_within_days", "cancelled_within_days", "window_days", "upcoming_within_days", "rebooking_days"]) {
    if (request[key] !== undefined) request[key] = toNumberFilter(request[key]);
  }

  if (slug === "vip-customers") {
    request.vip_min_spend = toNumberFilter(request.vip_min_spend);
    request.low_max_spend = toNumberFilter(request.low_max_spend);
  }

  return request;
};

