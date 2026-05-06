import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PayRunState, PayRun, PayRunSummary } from "../types/payRun.types";
import {
  fetchPayRunsThunk,
  fetchPayRunByIdThunk,
  createPayRunThunk,
  updatePayRunThunk,
  deletePayRunThunk,
} from "../middleware/payRun/payRun.thunk";

// ── Helper: recompute summary from current list ───────────────────────────────
function computeSummary(runs: PayRun[]): PayRunSummary {
  return runs.reduce(
    (acc, r) => ({
      earnings: acc.earnings + (r.earnings  || 0),
      other:    acc.other    + (r.other     || 0),
      total:    acc.total    + (r.total     || 0),
      paid:     acc.paid     + (r.paid      || 0),
      toPay:    acc.toPay    + (r.toPay     || 0),
    }),
    { earnings: 0, other: 0, total: 0, paid: 0, toPay: 0 }
  );
}

const initialState: PayRunState = {
  payRuns: [],
  summary: { earnings: 0, other: 0, total: 0, paid: 0, toPay: 0 },
  loading: false,
  error: null,
  success: false,
  totalItems: 0,
  currentPage: 1,
  totalPages: 1,
};

const payRunSlice = createSlice({
  name: "payRun",
  initialState,
  reducers: {
    clearPayRunError: (state) => { state.error = null; },
    clearPayRunSuccess: (state) => { state.success = false; },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {

    // ── Fetch All ────────────────────────────────────────────────────────────
    builder.addCase(fetchPayRunsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPayRunsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.payRuns   = action.payload.items;
      state.summary   = action.payload.summary;
      state.totalItems = action.payload.total;
    });
    builder.addCase(fetchPayRunsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Fetch By ID ──────────────────────────────────────────────────────────
    builder.addCase(fetchPayRunByIdThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPayRunByIdThunk.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(fetchPayRunByIdThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Create ───────────────────────────────────────────────────────────────
    builder.addCase(createPayRunThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    });
    builder.addCase(createPayRunThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.success = true;
      // Deduplicate then prepend
      const filtered = state.payRuns.filter((r) => r.id !== action.payload.id);
      state.payRuns  = [action.payload, ...filtered];
      state.totalItems = state.payRuns.length;
      // Recompute summary so cards update immediately
      state.summary  = computeSummary(state.payRuns);
    });
    builder.addCase(createPayRunThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Update ───────────────────────────────────────────────────────────────
    builder.addCase(updatePayRunThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    });
    builder.addCase(updatePayRunThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.success = true;
      const idx = state.payRuns.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.payRuns[idx] = action.payload;
      // Recompute summary
      state.summary = computeSummary(state.payRuns);
    });
    builder.addCase(updatePayRunThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // ── Delete ───────────────────────────────────────────────────────────────
    builder.addCase(deletePayRunThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deletePayRunThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.payRuns  = state.payRuns.filter((r) => r.id !== action.payload);
      state.totalItems = state.payRuns.length;
      // Recompute summary
      state.summary  = computeSummary(state.payRuns);
    });
    builder.addCase(deletePayRunThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearPayRunError, clearPayRunSuccess, setCurrentPage } = payRunSlice.actions;
export default payRunSlice.reducer;
