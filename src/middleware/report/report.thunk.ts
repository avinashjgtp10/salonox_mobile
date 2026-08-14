import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  getReportConfig,
  type ReportFilters,
  type ReportSlug,
} from "@/features/reports/report-config";
import { getApiErrorMessage } from "@/services/api";
import { reportService, type GenericReportRequest } from "@/services/report.service";
import type { RootState } from "@/store";

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

const ARRAY_FILTER_KEYS = new Set([
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
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const toNumberFilter = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

const normalizeRequest = (slug: ReportSlug, filters: ReportFilters): GenericReportRequest => {
  const request: GenericReportRequest = { ...cleanFilters(filters) };

  for (const key of ARRAY_FILTER_KEYS) {
    if (request[key] !== undefined) {
      request[key] = splitArrayFilter(request[key]);
    }
  }

  if (slug === "open-rate" && request.include_trend === "true") {
    request.include_trend = true;
  }

  if (slug === "vip-customers") {
    request.vip_min_spend = toNumberFilter(request.vip_min_spend);
    request.low_max_spend = toNumberFilter(request.low_max_spend);
  }

  return request;
};

export const fetchReportThunk = createAsyncThunk<
  { data: unknown; filters: ReportFilters; slug: ReportSlug },
  FetchReportArgs,
  { rejectValue: ReportRejectValue; state: RootState }
>(
  "report/fetch",
  async (args, { rejectWithValue }) => {
    try {
      const config = getReportConfig(args.slug);

      if (!config) {
        throw new Error("Unknown report.");
      }

      if (config.status !== "available" || !config.endpoint) {
        throw new Error(config.statusReason ?? "This report is not available in mobile yet.");
      }

      const data = await reportService.getReport(
        config.endpoint,
        normalizeRequest(args.slug, args.filters),
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
