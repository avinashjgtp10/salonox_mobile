import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { createDefaultReportFilters, type ReportFilters, type ReportSlug } from "@/features/reports/report-config";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import type { RootState } from "@/store";

export type ReportData = Record<string, unknown>;

export type ReportEntry = {
  currentRequestId: string | null;
  data: ReportData | null;
  error: string | null;
  filters: ReportFilters;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
};

type ReportState = {
  bySlug: Partial<Record<ReportSlug, ReportEntry>>;
};

const initialState: ReportState = { bySlug: {} };

const getEntry = (state: ReportState, slug: ReportSlug): ReportEntry => {
  const existing = state.bySlug[slug];
  if (existing) return existing;

  const entry: ReportEntry = {
    currentRequestId: null,
    data: null,
    error: null,
    filters: createDefaultReportFilters(slug),
    loading: false,
    loadingMore: false,
    refreshing: false,
  };
  state.bySlug[slug] = entry;
  return entry;
};

const asData = (value: unknown): ReportData =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ReportData
    : { rows: [] };

const mergePaginatedData = (current: ReportData | null, incoming: ReportData) => {
  const previousRows = Array.isArray(current?.rows) ? current.rows : [];
  const incomingRows = Array.isArray(incoming.rows) ? incoming.rows : [];
  return { ...incoming, rows: [...previousRows, ...incomingRows] };
};

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    rememberReportFilters(
      state,
      action: PayloadAction<{ filters: ReportFilters; slug: ReportSlug }>,
    ) {
      getEntry(state, action.payload.slug).filters = action.payload.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportThunk.pending, (state, action) => {
        const entry = getEntry(state, action.meta.arg.slug);
        entry.currentRequestId = action.meta.requestId;
        entry.error = null;
        entry.loading = !action.meta.arg.append && !action.meta.arg.refresh;
        entry.loadingMore = Boolean(action.meta.arg.append);
        entry.refreshing = Boolean(action.meta.arg.refresh);
      })
      .addCase(fetchReportThunk.fulfilled, (state, action) => {
        const entry = getEntry(state, action.payload.slug);
        if (entry.currentRequestId !== action.meta.requestId) return;

        const incoming = asData(action.payload.data);
        entry.data = action.meta.arg.append
          ? mergePaginatedData(entry.data, incoming)
          : incoming;
        entry.currentRequestId = null;
        entry.error = null;
        entry.filters = action.payload.filters;
        entry.loading = false;
        entry.loadingMore = false;
        entry.refreshing = false;
      })
      .addCase(fetchReportThunk.rejected, (state, action) => {
        const entry = getEntry(state, action.meta.arg.slug);
        if (entry.currentRequestId !== action.meta.requestId) return;

        entry.currentRequestId = null;
        entry.error = action.payload?.message ?? "Unable to load this report.";
        entry.loading = false;
        entry.loadingMore = false;
        entry.refreshing = false;
      });
  },
});

export const { rememberReportFilters } = reportSlice.actions;
export const selectReportEntry = (state: RootState, slug: ReportSlug) =>
  state.report.bySlug[slug];
export default reportSlice.reducer;
