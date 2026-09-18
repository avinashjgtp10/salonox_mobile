import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppRedux";
import {
  closeCashCounterThunk,
  fetchCashCounterDashboardThunk,
  openCashCounterThunk,
} from "../../middleware/cashCounter/cashCounter.thunk";
import {
  createCashExpense,
  deleteCashExpense,
  fetchCashExpenses,
  fetchCashSummaryBundle,
  fetchCashTransactions,
  updateCashExpense,
} from "./cashManagement.api";
import type {
  CashDashboardSummary,
  CashExpensePayload,
  CashExpenseRecord,
  CashTransactionRecord,
  CloseCounterPayload,
  OpenCounterPayload,
  UpdateCashExpensePayload,
} from "./cashManagement.types";

interface LoadingState {
  dashboard: boolean;
  transactions: boolean;
  expenses: boolean;
  openCounter: boolean;
  closeCounter: boolean;
  saveExpense: boolean;
  deleteExpense: boolean;
  todayRevenue: boolean;
}

const emptySummary: CashDashboardSummary = {
  cashManagementId: "",
  status: "closed",
  openingBalance: 0,
  cashRevenue: 0,
  cashExpense: 0,
  closingBalance: 0,
  inStoreCash: 0,
  reconciliationAmount: 0,
  upiAmount: 0,
  cardAmount: 0,
  cashAmount: 0,
  openedAt: null,
  closedAt: null,
  remarks: null,
};

const logBackgroundRefreshError = (label: string, error: unknown) => {
  console.error(`[cash-management] ${label} refresh failed`, error);
};

const shouldSuppressCashCounterNotification = (message: string | null | undefined) => {
  if (!message) return false;

  return message.trim().toLowerCase() === "no cash counter found for this salon";
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== "object") return fallback;

  const apiError = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: unknown;
  };
  const message =
    apiError.response?.data?.message ??
    apiError.response?.data?.error ??
    apiError.message;

  return typeof message === "string" && message.trim() ? message : fallback;
};

export function useCashManagement() {
  const dispatch = useAppDispatch();
  // The counter/dashboard itself lives in Redux (cashCounterSlice) — it's
  // shared with the main navbar's Close Counter shortcut, so opening or
  // closing the counter from either place updates both instantly.
  const dashboardState = useAppSelector((state) => state.cashCounter.dashboard);
  const dashboardStateRef = useRef(dashboardState);
  dashboardStateRef.current = dashboardState;
  // DashboardLayout also dispatches fetchCashCounterDashboardThunk on its own
  // mount (it needs the counter status app-wide, to gate the "unclosed
  // counter" prompt from any page) — on a hard refresh landing directly on
  // /cash-management, DashboardLayout and this hook both mount in the same
  // tick and would otherwise fire this identical request twice. Tracked in a
  // ref (not just read inline) so loadDashboard's useCallback below always
  // sees the latest value without needing either as a dependency — putting
  // them in the dependency array would recreate loadDashboard (and
  // everything downstream: refreshAll, the mount effect) on every fetch,
  // since fetching is exactly what changes these values, risking a loop.
  const cashCounterLoading = useAppSelector((state) => state.cashCounter.loading);
  const cashCounterLoadingRef = useRef(cashCounterLoading);
  cashCounterLoadingRef.current = cashCounterLoading;
  const [transactions, setTransactions] = useState<CashTransactionRecord[]>([]);
  const [expenses, setExpenses] = useState<CashExpenseRecord[]>([]);
  // Kept separate from `dashboard` (the cash counter) on purpose — the
  // counter's cashRevenue is zeroed out whenever there's no open session
  // (see getZeroSummaryDashboard in CashManagementPage), but today's total
  // revenue must keep showing regardless of counter status.
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    dashboard: false,
    transactions: false,
    expenses: false,
    openCounter: false,
    closeCounter: false,
    saveExpense: false,
    deleteExpense: false,
    todayRevenue: false,
  });

  const runTask = useCallback(async <T,>(
    key: keyof LoadingState,
    task: () => Promise<T>,
  ) => {
    setLoading((current) => ({ ...current, [key]: true }));
    try {
      return await task();
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    // A fetch dispatched moments ago by DashboardLayout's own mount effect
    // is still in flight for this exact same data — piggyback on it instead
    // of firing an identical, redundant request. It's already reflected in
    // Redux the moment it resolves, so no separate wait/subscribe is needed
    // here; the component just rerenders off `dashboardState` as usual.
    if (cashCounterLoadingRef.current) return dashboardStateRef.current;
    return runTask("dashboard", () => dispatch(fetchCashCounterDashboardThunk()).unwrap());
  }, [runTask, dispatch]);

  const loadTransactions = useCallback(async () => {
    const next = await runTask("transactions", () => fetchCashTransactions());
    setTransactions(next);
    return next;
  }, [runTask]);

  const loadExpenses = useCallback(async () => {
    const next = await runTask("expenses", () => fetchCashExpenses());
    setExpenses(next);
    return next;
  }, [runTask]);

  const loadSummaryBundle = useCallback(async () => {
    setLoading((current) => ({ ...current, transactions: true, expenses: true, todayRevenue: true }));
    try {
      const next = await fetchCashSummaryBundle();
      setTransactions(next.transactions);
      setExpenses(next.expenses);
      setTodayRevenue(next.todayRevenue);
      return next;
    } finally {
      setLoading((current) => ({ ...current, transactions: false, expenses: false, todayRevenue: false }));
    }
  }, []);

  // Full-page load: one POST (transactions + expenses + today's revenue) via
  // the summary-bundle endpoint, run alongside the dashboard's own Redux-
  // backed fetch (kept separate, see loadDashboard above).
  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([loadDashboard(), loadSummaryBundle()]);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to load cash management data");
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
    }
  }, [loadDashboard, loadSummaryBundle]);

  const refreshDashboard = useCallback(async () => {
    setError(null);
    try {
      await loadDashboard();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to load cash management dashboard");
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadDashboard]);

  const refreshTransactions = useCallback(async () => {
    setError(null);
    try {
      await loadTransactions();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to load cash transactions");
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadTransactions]);

  const refreshExpenses = useCallback(async () => {
    setError(null);
    try {
      await loadExpenses();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to load cash expenses");
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadExpenses]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleOpenCounter = useCallback(async (payload: OpenCounterPayload) => {
    const next = await runTask("openCounter", () => dispatch(openCashCounterThunk(payload)).unwrap());
    const results = await Promise.allSettled([refreshTransactions()]);
    results.forEach((result) => {
      if (result.status === "rejected") {
        logBackgroundRefreshError("transactions", result.reason);
      }
    });

    return next;
  }, [
    dispatch,
    refreshTransactions,
    runTask,
  ]);



  // CLose Counter
  const handleCloseCounter = useCallback(async (payload: CloseCounterPayload) => {
    const next = await runTask("closeCounter", () => dispatch(closeCashCounterThunk(payload)).unwrap());
    const results = await Promise.allSettled([refreshTransactions(), refreshExpenses()]);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logBackgroundRefreshError(index === 0 ? "transactions" : "expenses", result.reason);
      }
    });

    return next;
  }, [dispatch, refreshExpenses, refreshTransactions, runTask]);


  const handleCreateExpense = useCallback(async (payload: CashExpensePayload) => {
    return runTask("saveExpense", () => createCashExpense(payload));
  }, [runTask]);


  const handleUpdateExpense = useCallback(async (payload: UpdateCashExpensePayload) => {
    return runTask("saveExpense", () => updateCashExpense(payload));
  }, [runTask]);


const handleDeleteExpense = useCallback(async (id: string) => {
  await runTask("deleteExpense", () => deleteCashExpense(id));
}, [runTask]);




  const dashboard = dashboardState ?? emptySummary;
  // True only once a dashboard fetch has actually resolved (with real data,
  // or a confirmed "no counter yet" — see cashCounter.thunk.ts) — never true
  // for the pre-fetch default. Callers that auto-force a modal based on
  // counter state (e.g. the mandatory Open/Close Counter flow) must gate on
  // this, not just `loading.dashboard` — otherwise a transient default
  // value, or a fetch that failed for an unrelated reason (auth timing on a
  // hard refresh, a network blip), gets misread as "confirmed: no counter",
  // popping a modal that can't be dismissed and won't self-correct.
  const dashboardLoaded = dashboardState !== null;

  const activeCounterClosed = useMemo(() => {
    return !dashboard?.cashManagementId || dashboard.status === "closed";
  }, [dashboard]);

  return {
    dashboard,
    dashboardLoaded,
    transactions,
    expenses,
    todayRevenue,
    error,
    loading,
    activeCounterClosed,
    refreshAll,
    refreshDashboard,
    refreshTransactions,
    refreshExpenses,
    openCounter: handleOpenCounter,
    closeCounter: handleCloseCounter,
    createExpense: handleCreateExpense,
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
  };
}
