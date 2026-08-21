import { useCallback, useEffect, useMemo, useState } from "react";
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
  fetchCashTransactions,
  fetchTodaysRevenue,
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

  const loadTodayRevenue = useCallback(async () => {
    const next = await runTask("todayRevenue", () => fetchTodaysRevenue());
    setTodayRevenue(next);
    return next;
  }, [runTask]);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([loadDashboard(), loadTransactions(), loadExpenses(), loadTodayRevenue()]);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to load cash management data");
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
    }
  }, [loadDashboard, loadExpenses, loadTransactions, loadTodayRevenue]);

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

  const refreshTodayRevenue = useCallback(async () => {
    try {
      await loadTodayRevenue();
    } catch (err: unknown) {
      // Deliberately not surfaced via the shared `error`/notification banner —
      // this card should never look broken just because the cash counter
      // (a separate concern) has an issue.
      console.error("[cash-management] today's revenue refresh failed", err);
    }
  }, [loadTodayRevenue]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Cash payments taken from other modules (Quick Sale, Calendar checkout,
  // another tab/device) don't push an update here — this page only ever
  // refetches on mount or after its own actions. Without polling, Cash
  // Revenue/In Store Cash/the transaction list can sit stale indefinitely
  // while the page stays open, which reads as "the sync is broken" even
  // though the backend already has the correct number. Paused while the tab
  // isn't visible so it doesn't burn requests in a backgrounded tab.
  useEffect(() => {
    const POLL_INTERVAL_MS = 20000;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshAll();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
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
    refreshTodayRevenue,
    openCounter: handleOpenCounter,
    closeCounter: handleCloseCounter,
    createExpense: handleCreateExpense,
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
  };
}
