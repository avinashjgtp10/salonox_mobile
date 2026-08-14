import { createSlice } from "@reduxjs/toolkit";
import type { CashDashboardSummary } from "../features/cash-management/cashManagement.types";
import {
  closeCashCounterThunk,
  fetchCashCounterDashboardThunk,
  openCashCounterThunk,
} from "../middleware/cashCounter/cashCounter.thunk";

// Single shared source of truth for the cash counter's open/closed status —
// read by both the Cash Management page and the main navbar's Close Counter
// shortcut, so closing the counter from either place updates both instantly.
interface CashCounterState {
  dashboard: CashDashboardSummary | null;
  loading: boolean;
}

const initialState: CashCounterState = {
  dashboard: null,
  loading: false,
};

const summaryAmountKeys: Array<
  keyof Pick<
    CashDashboardSummary,
    | "openingBalance"
    | "cashRevenue"
    | "cashExpense"
    | "closingBalance"
    | "inStoreCash"
    | "reconciliationAmount"
  >
> = [
  "openingBalance",
  "cashRevenue",
  "cashExpense",
  "closingBalance",
  "inStoreCash",
  "reconciliationAmount",
];

const hasAllZeroSummaryAmounts = (summary: CashDashboardSummary) =>
  summaryAmountKeys.every((key) => summary[key] === 0);

const hasAnyNonZeroSummaryAmount = (summary: CashDashboardSummary) =>
  summaryAmountKeys.some((key) => summary[key] !== 0);

// Guards against a brief backend race where a freshly-opened/closed counter
// momentarily reports back as "closed" with all-zero amounts before the
// real numbers land — without this, the summary cards would flash to zero
// and back on every refresh right after opening or closing a counter.
const mergeDashboardSummary = (
  current: CashDashboardSummary | null,
  next: CashDashboardSummary,
) => {
  if (
    current &&
    next.status === "closed" &&
    hasAllZeroSummaryAmounts(next) &&
    hasAnyNonZeroSummaryAmount(current)
  ) {
    return {
      ...next,
      openingBalance: current.openingBalance,
      cashRevenue: current.cashRevenue,
      cashExpense: current.cashExpense,
      closingBalance: current.closingBalance,
      inStoreCash: current.inStoreCash,
      reconciliationAmount: current.reconciliationAmount,
    };
  }

  return next;
};

const cashCounterSlice = createSlice({
  name: "cashCounter",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCashCounterDashboardThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCashCounterDashboardThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = mergeDashboardSummary(state.dashboard, action.payload);
      })
      .addCase(fetchCashCounterDashboardThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(openCashCounterThunk.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      })
      .addCase(closeCashCounterThunk.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      });
  },
});

export default cashCounterSlice.reducer;
