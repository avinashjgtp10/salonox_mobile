import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  closeCashCounter,
  fetchCashDashboard,
  openCashCounter,
} from "../../features/cash-management/cashManagement.api";
import type {
  CashDashboardSummary,
  CloseCounterPayload,
  OpenCounterPayload,
} from "../../features/cash-management/cashManagement.types";

// rejectWithValue passes the raw caught error (not just its message) so
// callers using `.unwrap()` still get the original axios error shape
// (err.response.data.message) that the cash-management UI's error handling
// already expects — the same behaviour as before this moved into Redux.

const NO_COUNTER_MESSAGE = "no cash counter found for this salon";

const confirmedNoCounterDashboard: CashDashboardSummary = {
  cashManagementId: "",
  status: "closed",
  openingBalance: 0,
  cashRevenue: 0,
  cashExpense: 0,
  closingBalance: 0,
  inStoreCash: 0,
  reconciliationAmount: 0,
  openedAt: null,
  closedAt: null,
  remarks: null,
};

export const fetchCashCounterDashboardThunk = createAsyncThunk<
  CashDashboardSummary,
  void,
  { rejectValue: any }
>("cashCounter/fetchDashboard", async (_, { rejectWithValue }) => {
  try {
    return await fetchCashDashboard();
  } catch (err: any) {
    const message = String(err?.message ?? err?.response?.data?.message ?? "").trim().toLowerCase();
    // "No counter for this salon" is a definitive, confirmed answer (a
    // brand-new salon that has literally never opened one) — not a failure
    // to surface as an error. Resolving with a real value here (instead of
    // rejecting) lets the Redux slice hold trustworthy, confirmed state
    // instead of staying null/unresolved, which callers treat as "don't
    // know yet, don't force any mandatory modal based on this".
    if (message === NO_COUNTER_MESSAGE) {
      return confirmedNoCounterDashboard;
    }
    return rejectWithValue(err);
  }
});

export const openCashCounterThunk = createAsyncThunk<
  CashDashboardSummary,
  OpenCounterPayload,
  { rejectValue: any }
>("cashCounter/open", async (payload, { rejectWithValue }) => {
  try {
    return await openCashCounter(payload);
  } catch (err) {
    return rejectWithValue(err);
  }
});

export const closeCashCounterThunk = createAsyncThunk<
  CashDashboardSummary,
  CloseCounterPayload,
  { rejectValue: any }
>("cashCounter/close", async (payload, { rejectWithValue }) => {
  try {
    return await closeCashCounter(payload);
  } catch (err) {
    return rejectWithValue(err);
  }
});
