import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CashStack,
  ChevronDown,
  CheckCircle,
  Calculator,
  GraphUpArrow,
  JournalText,
  ListCheck,
  PlusCircle,
  PlusLg,
  Receipt,
  Safe2,
  Wallet2,
} from "react-bootstrap-icons";
import { Button, DateRangeFilter, Tabs, getDateRangePresetValue } from "../../../components/ui";
import type {
  DateRangeFilterValue,
} from "../../../components/ui";
import type {
  CashManagementExportDataset,
  CashManagementExportFormat,
} from "../cashManagement.export";
import {
  exportCashManagementCSV,
  exportCashManagementExcel,
  exportCashManagementPDF,
} from "../cashManagement.export";
import { sendDailySummaryEmail } from "../cashManagement.api";
import { selectUserProfile } from "../../../store/selectors/slices.selectors";
import { useAppSelector } from "../../../hooks/useAppRedux";
import type { CashExpenseRecord } from "../cashManagement.types";
import { useCashManagement } from "../useCashManagement";
import CashManagementExpensesTab from "./CashManagementExpensesTab";
import CashManagementNotificationBanner, {
  type CashManagementNotificationTone,
} from "./CashManagementNotificationBanner";
import CashManagementTransactionsTab from "./CashManagementTransactionsTab";
import {
  CloseCounterModal,
  DeleteExpenseModal,
  ExpenseModal,
  OpenCounterModal,
} from "./CashManagementModals";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/CashManagementPage.scss";

type ActiveTab = "transactions" | "expenses";
type NotificationState = {
  tone: CashManagementNotificationTone;
  message: string;
} | null;

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getZeroSummaryDashboard = (dashboard: ReturnType<typeof useCashManagement>["dashboard"]) => ({
  ...dashboard,
  openingBalance: 0,
  cashRevenue: 0,
  cashExpense: 0,
  closingBalance: 0,
  inStoreCash: 0,
  reconciliationAmount: 0,
});

function isInDateRange(date?: string | null, sharedDateFrom?: string, sharedDateTo?: string) {
  if (!date) return false;

  const rowDate = new Date(date);

  if (sharedDateFrom && rowDate < new Date(`${sharedDateFrom}T00:00:00`)) {
    return false;
  }

  if (sharedDateTo && rowDate > new Date(`${sharedDateTo}T23:59:59`)) {
    return false;
  }

  return true;
}

export default function CashManagementPage() {
  const { formatAmount } = useCurrency();
  const userProfile = useAppSelector(selectUserProfile);
  const userEmail = userProfile?.email;
  const {
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
    openCounter,
    closeCounter,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useCashManagement();

  const [activeTab, setActiveTab] = useState<ActiveTab>("transactions");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CashExpenseRecord | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<CashExpenseRecord | null>(null);
  const [notification, setNotification] = useState<NotificationState>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<CashManagementExportFormat | null>(null);
  const [exportDataset, setExportDataset] = useState<CashManagementExportDataset | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    preset: "today",
    ...getDateRangePresetValue("today"),
  }));
  const [expenseActionLoading, setExpenseActionLoading] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const dailyCashFlowRef = useRef<HTMLElement | null>(null);
  const expenseActionsLoading =
    expenseActionLoading || loading.saveExpense || loading.deleteExpense;


  // Detects whether the currently open counter (if any) was opened on a
  // previous day and never closed — that counter must be closed before a
  // new one can be started, per the daily open/close flow.
  const today = formatDateInput(new Date());
  const openedDateKey = dashboard.openedAt ? formatDateInput(new Date(dashboard.openedAt)) : null;
  const hasOpenCounter = Boolean(dashboard.cashManagementId) && dashboard.status === "open";
  const isStaleOpenCounter = hasOpenCounter && openedDateKey !== null && openedDateKey !== today;
  // The counter that was opened AND closed earlier today — the backend now
  // rejects a second open the same day ("once per day"), so this must NOT
  // be treated as "needs opening" the way a genuinely never-opened day is.
  // Without this, closing today's counter would immediately re-trigger the
  // mandatory Open Counter modal, which would then just fail every time the
  // user submits it — a dead end they can't get out of until tomorrow.
  const closedToday =
    Boolean(dashboard.cashManagementId) &&
    dashboard.status === "closed" &&
    openedDateKey !== null &&
    openedDateKey === today;
  const needsOpenCounter = !hasOpenCounter && !closedToday;

  // Keyed on the fields that actually define the counter's state (not the
  // dashboard object identity, which changes on every fetch) so this only
  // fires once per real state transition — e.g. it won't re-force a modal
  // the user just dismissed just because a background refresh re-ran.
  const counterStateKey = `${dashboard.cashManagementId}|${dashboard.status}|${dashboard.openedAt ?? ""}`;

  useEffect(() => {
    // Never force a modal from unconfirmed data — the pre-fetch default,
    // or a fetch that's still loading/failed for an unrelated reason (e.g.
    // an auth-timing race right after a hard page refresh), must not be
    // read as "confirmed: no counter today". See dashboardLoaded's comment
    // in useCashManagement.ts for the bug this previously caused: the
    // mandatory Open Counter modal getting stuck showing even with a
    // genuinely closed-today counter, because it acted on stale/incomplete
    // state instead of waiting for a real answer.
    if (loading.dashboard || !dashboardLoaded) return;

    if (isStaleOpenCounter) {
      setShowCloseModal(true);
      setShowOpenModal(false);
    } else if (needsOpenCounter) {
      setShowOpenModal(true);
      setShowCloseModal(false);
    } else {
      // Counter is open for today (the normal case) — explicitly dismiss
      // both forced modals. Without this, a stale/no-counter modal that got
      // shown transiently (e.g. from the pre-fetch default dashboard on the
      // very first render, before the real "counter is open" data has
      // loaded) never got closed once the real data arrived, since neither
      // branch above ran again to hide it — it stayed stuck open forever,
      // reappearing on every refresh even with a genuinely open counter.
      setShowOpenModal(false);
      setShowCloseModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterStateKey, loading.dashboard, dashboardLoaded]);

  const openedTimeLabel = useMemo(() => {
    if (!hasOpenCounter || !dashboard.openedAt) return null;
    const openedDate = new Date(dashboard.openedAt);
    if (Number.isNaN(openedDate.getTime())) return null;
    return openedDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [hasOpenCounter, dashboard.openedAt]);

  const transactionTabCount = useMemo(() => {
    return transactions.filter((item) => isInDateRange(item.updatedAt ?? item.date, dateRange.startDate, dateRange.endDate)).length;
  }, [transactions, dateRange.startDate, dateRange.endDate]);

  const expenseTabCount = useMemo(() => {
    return expenses.filter((item) => isInDateRange(item.updatedAt ?? item.expenseDate, dateRange.startDate, dateRange.endDate)).length;
  }, [expenses, dateRange.startDate, dateRange.endDate]);

  // Same date-range slice the Expenses tab counts (`expenseTabCount` above) —
  // reused here so the two stay in agreement no matter which date filter is
  // applied.
  const expensesInRange = useMemo(
    () => expenses.filter((item) => isInDateRange(item.updatedAt ?? item.expenseDate, dateRange.startDate, dateRange.endDate)),
    [expenses, dateRange.startDate, dateRange.endDate],
  );


  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!error) return;
    setNotification({ tone: "error", message: error });
  }, [error]);

  const showNotification = (tone: CashManagementNotificationTone, message: string) => {
    setNotification({ tone, message });
  };

  const summaryDashboard = useMemo(() => {
    return dashboard.status === "closed" ? getZeroSummaryDashboard(dashboard) : dashboard;
  }, [dashboard]);

  const summaryCards = useMemo(
    () => [
      {
        // Sourced from `todayRevenue`, not `summaryDashboard` — this must
        // keep showing today's actual revenue whether the cash counter is
        // open, closed, or was never opened at all, unlike Cash Revenue
        // below which is intentionally zeroed with no active counter session.
        label: "Today's Revenue",
        value: formatAmount(todayRevenue),
        icon: <GraphUpArrow size={18} />,
        tone: "success",
      },
      {
        label: "Opening Balance",
        value: formatAmount(summaryDashboard.openingBalance),
        icon: <Wallet2 size={18} />,
        tone: "primary",
      },
      {
        label: "Cash Revenue",
        value: formatAmount(summaryDashboard.cashRevenue),
        icon: <CashStack size={18} />,
        tone: "success",
      },
      {
        label: "Cash Expense",
        value: formatAmount(summaryDashboard.cashExpense),
        icon: <JournalText size={18} />,
        tone: "warning",
      },
      {
        label: "Closing Balance",
        value: formatAmount(summaryDashboard.closingBalance),
        icon: <Safe2 size={18} />,
        tone: "dark",
      },
      {
        label: "In Store Cash",
        value: formatAmount(summaryDashboard.inStoreCash),
        icon: <CheckCircle size={18} />,
        tone: "info",
      },
      {
        label: "Reconciliation Amount",
        value: formatAmount(summaryDashboard.reconciliationAmount),
        icon: <Safe2 size={18} />,
        tone:
          summaryDashboard.reconciliationAmount === 0
            ? "neutral"
            : summaryDashboard.reconciliationAmount > 0
              ? "success"
              : "danger",
      },
    ],
    [summaryDashboard, todayRevenue, formatAmount],
  );

  const expenseSummaryCards = useMemo(() => {
    const count = expensesInRange.length;
    const total = expensesInRange.reduce((sum, item) => sum + (item.amount || 0), 0);
    const average = count > 0 ? total / count : 0;

    return [
      {
        label: "Total Expenses",
        value: formatAmount(total),
        icon: <Receipt size={18} />,
        tone: "warning",
      },
      {
        label: "Expense Count",
        value: String(count),
        icon: <ListCheck size={18} />,
        tone: "primary",
      },
      {
        label: "Average Expense",
        value: formatAmount(average),
        icon: <Calculator size={18} />,
        tone: "info",
      },
    ];
  }, [expensesInRange, formatAmount]);

  const tabs = useMemo(
    () => [
      {
        key: "transactions",
        label: "Transactions",
        count: transactionTabCount,
      },
      {
        key: "expenses",
        label: "Expenses",
        count: expenseTabCount,
      },
    ],
    [transactionTabCount, expenseTabCount]
  );
  const openExpenseCreate = () => {
    if (expenseActionsLoading) return;
    // Both "Add Expenses" buttons live outside the Daily Cash Flow tabs, so
    // clicking them switches Daily Cash Flow to its Expenses tab (showing
    // the full history) at the same time the add-expense modal opens on top
    // of it — closing the modal (with or without saving) leaves the history
    // table right there instead of dropping the user back on Transactions.
    setActiveTab("expenses");
    setEditingExpense(null);
    setShowExpenseModal(true);
    dailyCashFlowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openExpenseEdit = (expense: CashExpenseRecord) => {
    if (expenseActionsLoading) return;
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };


  const runExport = async (format: CashManagementExportFormat) => {
    if (!exportDataset || exportingFormat) return;
    setExportingFormat(format);
    try {
      const options = {
        dataset: exportDataset,
        exportedAt: new Date(),
      };

      if (format === "pdf") {
        exportCashManagementPDF(options);
      } else if (format === "excel") {
        exportCashManagementExcel(options);
      } else {
        exportCashManagementCSV(options);
      }
      setIsExportMenuOpen(false);
    } catch (err: any) {
      showNotification("error", err?.message ?? "Failed to export report.");
    } finally {
      setExportingFormat(null);
    }
  };

  const runExpenseActionRefreshes = (tasks: Array<() => Promise<unknown>>) => {
    void (async () => {
      try {
        const minimumDelay = new Promise((resolve) => {
          window.setTimeout(resolve, 2000);
        });

        await Promise.allSettled([
          minimumDelay,
          ...tasks.map(async (task) => {
            try {
              await task();
            } catch (refreshError) {
              console.error("[cash-management] expense refresh failed", refreshError);
            }
          }),
        ]);
      } finally {
        setExpenseActionLoading(false);
      }
    })();
  };

  return (
    <div className="cash-mgmt">
      <div className="cash-mgmt__content">
        <section className="cash-mgmt__header">
          <div className="cash-mgmt__header-copy">
            <span className="cash-mgmt__eyebrow">Cash Management</span>
            <h1 className="cash-mgmt__title">Cash  Dashboard</h1>
            <p className="cash-mgmt__subtitle">
              Track opening cash, revenue, expenses, reconciliation, and daily counter closing
              in one place.
            </p>
            {openedTimeLabel ? (
              <span className="cash-mgmt__counter-status-pill">
                <CheckCircle size={12} /> Counter opened at {openedTimeLabel}
              </span>
            ) : null}
          </div>


          <div className="cash-mgmt__header-actions">
            <Button
              variant="outline-dark"
              iconLeft={<ArrowClockwise size={14} />}
              onClick={() => void refreshAll()}
            >
              All Refresh
            </Button>

            <Button
              variant="dark"
              iconLeft={<PlusCircle size={14} />}
              onClick={() => setShowOpenModal(true)}
              disabled={!activeCounterClosed || closedToday}
              title={closedToday ? "You can open the cash counter only once per day." : undefined}
            >
              Open Counter
            </Button>
            <Button
              variant="outline-danger"
              iconLeft={<CheckCircle size={14} />}
              onClick={() => setShowCloseModal(true)}
              disabled={activeCounterClosed}
            >
              Close Counter
            </Button>
          </div>
        </section>

        {notification ? (
          <CashManagementNotificationBanner
            tone={notification.tone}
            message={notification.message}
          />
        ) : null}

        <section className="cash-mgmt__summary-section">
          <div className="cash-mgmt__section-header">
            <div className="cash-mgmt__section-copy">
              <h2 className="cash-mgmt__surface-title">Summary Cards</h2>
            </div>
          </div>

          <div className="cash-mgmt__summary-grid">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className={`cash-mgmt__summary-card cash-mgmt__summary-card--${card.tone}`}
              >
                <div className="cash-mgmt__summary-content">
                  <div className={`cash-mgmt__summary-icon cash-mgmt__summary-icon--${card.tone}`}>
                    {card.icon}
                  </div>
                  <div className="cash-mgmt__summary-copy">
                    <strong className="cash-mgmt__summary-value">{card.value}</strong>
                    <span className="cash-mgmt__summary-label">{card.label}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cash-mgmt__summary-section">
          <div className="cash-mgmt__section-header">
            <div className="cash-mgmt__section-copy">
              <h2 className="cash-mgmt__surface-title">Expense Summary</h2>
            </div>
            <Button
              variant="dark"
              iconLeft={<PlusLg size={14} />}
              onClick={openExpenseCreate}
              disabled={activeCounterClosed || expenseActionsLoading}
              title={activeCounterClosed ? "Open the cash counter to add an expense." : undefined}
            >
              Add Expenses
            </Button>
          </div>

          <div className="cash-mgmt__summary-grid">
            {expenseSummaryCards.map((card) => (
              <article
                key={card.label}
                className={`cash-mgmt__summary-card cash-mgmt__summary-card--${card.tone}`}
              >
                <div className="cash-mgmt__summary-content">
                  <div className={`cash-mgmt__summary-icon cash-mgmt__summary-icon--${card.tone}`}>
                    {card.icon}
                  </div>
                  <div className="cash-mgmt__summary-copy">
                    <strong className="cash-mgmt__summary-value">{card.value}</strong>
                    <span className="cash-mgmt__summary-label">{card.label}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>


        <section className="cash-mgmt__surface" ref={dailyCashFlowRef}>
          <div className="cash-mgmt__surface-header">
            <div className="cash-mgmt__surface-copy">
              <h2 className="cash-mgmt__surface-title">Daily Cash Flow</h2>

            </div>
          </div>

          <div className="cash-mgmt__surface-controls">
            <div className="cash-mgmt__shared-filter-bar">
              <div className="cash-mgmt__shared-filter-group">
                <span className="cash-mgmt__shared-filter-label">Date Filter</span>
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </div>
            </div>

            <div className="cash-mgmt__surface-actions">
              <div className="cash-mgmt__export" ref={exportMenuRef}>
                <Button
                  variant="outline-dark"
                  iconLeft={<ChevronDown size={14} />}
                  onClick={() => setIsExportMenuOpen((current) => !current)}
                  disabled={
                    !exportDataset ||
                    Boolean(exportingFormat) ||
                    (activeTab === "expenses" && expenseActionsLoading)
                  }
                >
                  Export
                </Button>
                {isExportMenuOpen ? (
                  <div className="cash-mgmt__export-menu">
                    <button
                      type="button"
                      className="cash-mgmt__export-option"
                      onClick={() => void runExport("pdf")}
                      disabled={Boolean(exportingFormat) || (activeTab === "expenses" && expenseActionsLoading)}
                    >
                      {exportingFormat === "pdf" ? "Generating PDF..." : "Export PDF"}
                    </button>
                    <button
                      type="button"
                      className="cash-mgmt__export-option"
                      onClick={() => void runExport("excel")}
                      disabled={Boolean(exportingFormat) || (activeTab === "expenses" && expenseActionsLoading)}
                    >
                      {exportingFormat === "excel" ? "Generating Excel..." : "Export Excel"}
                    </button>
                    <button
                      type="button"
                      className="cash-mgmt__export-option"
                      onClick={() => void runExport("csv")}
                      disabled={Boolean(exportingFormat) || (activeTab === "expenses" && expenseActionsLoading)}
                    >
                      {exportingFormat === "csv" ? "Generating CSV..." : "Export CSV"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <Tabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as ActiveTab)}
            variant="underline"
            className="cash-mgmt__tabs"
          />

          <div className="cash-mgmt__tab-panel-wrap">
            {activeTab === "transactions" ? (
              <CashManagementTransactionsTab
                rows={transactions}
                loading={loading.transactions}
                sharedDateFilter={dateRange.preset}
                sharedDateFrom={dateRange.startDate}
                sharedDateTo={dateRange.endDate}
                //  onFilteredCountChange={setTransactionTabCount}
                onExportDataChange={setExportDataset}
              />
            ) : null}

            {activeTab === "expenses" ? (
              <CashManagementExpensesTab
                rows={expenses}
                loading={loading.expenses}
                canManage={!activeCounterClosed}
                actionsDisabled={expenseActionsLoading}
                sharedDateFilter={dateRange.preset}
                sharedDateFrom={dateRange.startDate}
                sharedDateTo={dateRange.endDate}
                // onFilteredCountChange={setExpenseTabCount}
                onExportDataChange={setExportDataset}
                onEdit={openExpenseEdit}
                onDelete={(expense) => {
                  if (expenseActionsLoading) return;
                  setDeletingExpense(expense);
                }}
              />
            ) : null}
          </div>
        </section>
      </div>

      <OpenCounterModal
        show={showOpenModal}
        loading={loading.openCounter}
        mandatory={needsOpenCounter}
        onClose={() => setShowOpenModal(false)}
        onSubmit={async (payload) => {
          await openCounter(payload);
          setShowOpenModal(false);
          showNotification("success", "Counter opened successfully.");
        }}
        onNotify={showNotification}
      />

      <ExpenseModal
        show={showExpenseModal}
        loading={loading.saveExpense}
        counterId={dashboard.cashManagementId}
        initialValue={editingExpense}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        onCreate={async (payload) => {
          setExpenseActionLoading(true);
          try {
            await createExpense(payload);
            setShowExpenseModal(false);
            setEditingExpense(null);
            showNotification("success", "Expense added successfully.");
            runExpenseActionRefreshes([
              refreshExpenses,
              refreshDashboard,
              refreshTransactions,
            ]);
          } catch (error) {
            setExpenseActionLoading(false);
            throw error;
          }
        }}
        onUpdate={async (payload) => {
          setExpenseActionLoading(true);
          try {
            await updateExpense(payload);
            setShowExpenseModal(false);
            setEditingExpense(null);
            showNotification("success", "Expense updated successfully.");
            runExpenseActionRefreshes([
              refreshDashboard,
              refreshTransactions,
              refreshExpenses,
            ]);
          } catch (error) {
            setExpenseActionLoading(false);
            throw error;
          }
        }}
        onNotify={showNotification}
      />

      <DeleteExpenseModal
        show={Boolean(deletingExpense)}
        expense={deletingExpense}
        loading={loading.deleteExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={async (id) => {
          setExpenseActionLoading(true);
          try {
            await deleteExpense(id);
            setDeletingExpense(null);
            showNotification("success", "Expense deleted successfully.");
            runExpenseActionRefreshes([
              refreshDashboard,
              refreshTransactions,
              refreshExpenses,
            ]);
          } catch (error) {
            setExpenseActionLoading(false);
            throw error;
          }
        }}
        onNotify={showNotification}
      />

      <CloseCounterModal
        show={showCloseModal}
        dashboard={dashboard}
        loading={loading.closeCounter}
        mandatory={isStaleOpenCounter}
        onClose={() => setShowCloseModal(false)}
        onSubmit={async (payload) => {
          const closed = await closeCounter(payload);
          try {
            await sendDailySummaryEmail(dashboard.cashManagementId, closed || dashboard, userEmail);
          } catch (emailErr) {
            console.error("[CashManagementPage] Daily summary email error:", emailErr);
          }
          setShowCloseModal(false);
          setShowOpenModal(true);
          showNotification("success", "Counter closed. Daily summary emailed to Salon Owner.");
        }}
        onNotify={showNotification}
      />
    </div>
  );
}
