import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closeCashCounter,
  createCashExpense,
  deleteCashExpense,
  fetchCashDashboard,
  fetchCashExpenses,
  fetchCashTransactions,
  fetchTodaysRevenue,
  openCashCounter,
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

const hasAllZeroSummaryAmounts = (summary: CashDashboardSummary) => {
  return summaryAmountKeys.every((key) => summary[key] === 0);
};

const hasAnyNonZeroSummaryAmount = (summary: CashDashboardSummary) => {
  return summaryAmountKeys.some((key) => summary[key] !== 0);
};

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

const logBackgroundRefreshError = (label: string, error: unknown) => {
  console.error(`[cash-management] ${label} refresh failed`, error);
};

const shouldSuppressCashCounterNotification = (message: string | null | undefined) => {
  if (!message) return false;

  return message.trim().toLowerCase() === "no cash counter found for this salon";
};

export function useCashManagement() {
  const [dashboard, setDashboard] = useState<CashDashboardSummary | null>(null);
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
    const next = await runTask("dashboard", () => fetchCashDashboard());
    setDashboard((current) => mergeDashboardSummary(current, next));
    return next;
  }, [runTask]);

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

  const runBackgroundRefreshes = useCallback(
    (tasks: Array<{ label: string; refresh: () => Promise<unknown> }>) => {
      tasks.forEach(({ label, refresh }) => {
        void refresh().catch((error) => {
          logBackgroundRefreshError(label, error);
        });
      });
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([loadDashboard(), loadTransactions(), loadExpenses(), loadTodayRevenue()]);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to load cash management data";
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
    }
  }, [loadDashboard, loadExpenses, loadTransactions, loadTodayRevenue]);

  const refreshDashboard = useCallback(async () => {
    setError(null);
    try {
      await loadDashboard();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to load cash management dashboard";
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadDashboard]);

  const refreshTransactions = useCallback(async () => {
    setError(null);
    try {
      await loadTransactions();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to load cash transactions";
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadTransactions]);

  const refreshExpenses = useCallback(async () => {
    setError(null);
    try {
      await loadExpenses();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to load cash expenses";
      setError(shouldSuppressCashCounterNotification(message) ? null : message);
      throw err;
    }
  }, [loadExpenses]);

  const refreshTodayRevenue = useCallback(async () => {
    try {
      await loadTodayRevenue();
    } catch (err: any) {
      // Deliberately not surfaced via the shared `error`/notification banner —
      // this card should never look broken just because the cash counter
      // (a separate concern) has an issue.
      console.error("[cash-management] today's revenue refresh failed", err);
    }
  }, [loadTodayRevenue]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleOpenCounter = useCallback(async (payload: OpenCounterPayload) => {
    const next = await runTask("openCounter", () => openCashCounter(payload));
    runBackgroundRefreshes([
      { label: "dashboard", refresh: refreshDashboard },
      { label: "transactions", refresh: refreshTransactions },
    ]);

    return next;
  }, [
    runBackgroundRefreshes,
    refreshDashboard,
    refreshTransactions,
    runTask,
  ]);



  // CLose Counter
  const handleCloseCounter = useCallback(async (payload: CloseCounterPayload) => {
    const next = await runTask("closeCounter", () => closeCashCounter(payload));
    runBackgroundRefreshes([
      { label: "dashboard", refresh: refreshDashboard },
      { label: "transactions", refresh: refreshTransactions },
      { label: "expenses", refresh: refreshExpenses },
    ]);

    return next;
  }, [refreshDashboard, refreshExpenses, refreshTransactions, runBackgroundRefreshes, runTask]);


  const handleCreateExpense = useCallback(async (payload: CashExpensePayload) => {
    return runTask("saveExpense", () => createCashExpense(payload));
  }, [runTask]);


  const handleUpdateExpense = useCallback(async (payload: UpdateCashExpensePayload) => {
    return runTask("saveExpense", () => updateCashExpense(payload));
  }, [runTask]);


const handleDeleteExpense = useCallback(async (id: string) => {
  await runTask("deleteExpense", () => deleteCashExpense(id));
}, [runTask]);




  const activeCounterClosed = useMemo(() => {
    return !dashboard?.cashManagementId || dashboard.status === "closed";
  }, [dashboard]);

  return {
    dashboard: dashboard ?? emptySummary,
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
