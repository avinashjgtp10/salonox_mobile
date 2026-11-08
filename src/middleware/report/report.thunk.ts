import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  getReportConfig,
  type ReportFilters,
  type ReportSlug,
} from "@/features/reports/report-config";
import { getApiErrorMessage } from "@/services/api";
import { REPORT } from "@/services/api/endpoints/report.endpoints";
import { reportService } from "@/services/report.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { getOperationalReport } from "@/features/reports/report-operational-data";
import { decodeReportSelection } from "@/features/reports/report-filters";
import { normalizeReportRequest } from "@/features/reports/report-request";

export type FetchReportArgs = {
  append?: boolean;
  filters: ReportFilters;
  refresh?: boolean;
  slug: ReportSlug;
};

type ReportRejectValue = { message: string };

export const fetchReportThunk = createAsyncThunk<
  { data: unknown; filters: ReportFilters; slug: ReportSlug },
  FetchReportArgs,
  { rejectValue: ReportRejectValue; state: RootState }
>(
  "report/fetch",
  async (args, { getState, rejectWithValue }) => {
    try {
      const config = getReportConfig(args.slug);

      if (!config) {
        throw new Error("Unknown report.");
      }

      if (config.status !== "available" || (!config.endpoint && !config.source)) {
        throw new Error(config.statusReason ?? "This report is not available in mobile yet.");
      }

      if (config.endpoint === REPORT.STOCK_RECONCILIATION) {
        const branchId = selectActiveBranchId(getState());

        if (!branchId) {
          throw new Error("No active branch selected.");
        }

        const data = await reportService.getConsumableUsage(branchId);

        const categories = decodeReportSelection(args.filters.category_ids);
        const search = (args.filters.search ?? "").trim().toLowerCase();
        const filteredRows = data.rows.filter((row) => (!categories.length || categories.includes(row.categoryName)) && (!search || row.itemName.toLowerCase().includes(search)));
        return { data: { ...data, rows: filteredRows, filtersAvailable: { categories: [...new Set(data.rows.map((row) => row.categoryName))] }, stats: { totalConsumed: filteredRows.reduce((sum, row) => sum + row.actualConsumable, 0), totalAdjusted: filteredRows.reduce((sum, row) => sum + row.adjustConsumable, 0) } }, filters: args.filters, slug: args.slug };
      }

      const request = normalizeReportRequest(args.slug, args.filters);
      const data = config.source && config.source !== "consumables" ? await getOperationalReport(config.source, request) : args.slug === "staff-performance"
        ? await reportService.getStaffPerformanceReport(request)
        : await reportService.getReport(
        config.endpoint as `/api/report/${string}`,
        request,
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
      // New filter selections supersede in-flight results (the slice guards request IDs).
      if (!args.append) return true;
      const entry = getState().report.bySlug[args.slug];
      return !entry?.loading && !entry?.loadingMore && !entry?.refreshing;
    },
  },
);
