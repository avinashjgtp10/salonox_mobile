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
import { useNavigate } from "react-router-dom";
import { sendDailySummaryEmail } from "../cashManagement.api";
import { selectUserProfile } from "../../../store/selectors/slices.selectors";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { performLogout } from "../../../utils/performLogout";
import { disconnectSocket } from "../../../services/socket/socket";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { showGlobalToast } from "../../../utils/globalToast";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
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

const getErrorMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== "object") return fallback;

  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

export default function CashManagementPage() {
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const handleLogout = () => {
    disconnectSocket();
    performLogout(navigate);
  };
  const { can } = usePermissions();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));
  const userProfile = useAppSelector(selectUserProfile);
  const userEmail = userProfile?.email;
  // Open/Close Counter use the shared success/error overlay (same as the
  // rest of the app, e.g. Tax Settings) instead of the inline notification
  // banner used by the other actions on this page.
  const { showSuccess: showCounterSuccess, showError: showCounterError, overlay: counterStatusOverlay } =
    useStatusOverlay();
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
    return transactions.reduce((count, item) => {
      const openedAt = item.openedAt ?? item.date;
      const openCount = isInDateRange(openedAt, dateRange.startDate, dateRange.endDate) ? 1 : 0;
      const closeCount = isInDateRange(item.closedAt, dateRange.startDate, dateRange.endDate) ? 1 : 0;
      return count + openCount + closeCount;
    }, 0);
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
    if (!can("add_expense")) { denyPerm("add_expense"); return; }
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
    if (!can("edit_expense")) { denyPerm("edit_expense"); return; }
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };


  const runExport = async (format: CashManagementExportFormat) => {
    if (!exportDataset || exportingFormat) return;
    // Entirely client-side (exportCashManagement*() below take an
    // already-built dataset, no API call) — no backend call to deny, so
    // this is the only enforcement point these dedicated Cash Management
    // export keys actually have (distinct from the generic export_pdf/
    // export_csv/export_excel used by other modules like Reports).
    const permKey = format === "pdf" ? "export_cash_management_pdf" : format === "excel" ? "export_cash_management_excel" : "export_cash_management_csv";
    if (!can(permKey)) {
      dispatch(showPermissionDenied(
        `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
      ));
      return;
    }
    // export_csv/export_excel/export_pdf (System) are now global master
    // gates — checked in addition to the module-specific key (Global
    // Download Switches ticket).
    const globalKey = format === "pdf" ? "export_pdf" : format === "excel" ? "export_excel" : "export_csv";
    if (!can(globalKey)) {
      dispatch(showPermissionDenied(
        `Your account does not have the "${globalKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
      ));
      return;
    }
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
    } catch (err: unknown) {
      showNotification("error", getErrorMessage(err, "Failed to export report."));
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
      {counterStatusOverlay}
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
              onClick={() => {
                if (!can("open_counter")) { denyPerm("open_counter"); return; }
                setShowOpenModal(true);
              }}
              disabled={(!activeCounterClosed || closedToday) && can("open_counter")}
              title={closedToday ? "You can open the cash counter only once per day." : undefined}
              style={!can("open_counter") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              Open Counter
            </Button>
            <Button
              variant="outline-danger"
              iconLeft={<CheckCircle size={14} />}
              onClick={() => {
                if (!can("close_counter")) { denyPerm("close_counter"); return; }
                setShowCloseModal(true);
              }}
              disabled={activeCounterClosed && can("close_counter")}
              style={!can("close_counter") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
              disabled={(activeCounterClosed || expenseActionsLoading) && can("add_expense")}
              title={activeCounterClosed ? "Open the cash counter to add an expense." : undefined}
              style={!can("add_expense") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                      style={(!can("export_cash_management_pdf") || !can("export_pdf")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                    >
                      {exportingFormat === "pdf" ? "Generating PDF..." : "Export PDF"}
                    </button>
                    <button
                      type="button"
                      className="cash-mgmt__export-option"
                      onClick={() => void runExport("excel")}
                      disabled={Boolean(exportingFormat) || (activeTab === "expenses" && expenseActionsLoading)}
                      style={(!can("export_cash_management_excel") || !can("export_excel")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                    >
                      {exportingFormat === "excel" ? "Generating Excel..." : "Export Excel"}
                    </button>
                    <button
                      type="button"
                      className="cash-mgmt__export-option"
                      onClick={() => void runExport("csv")}
                      disabled={Boolean(exportingFormat) || (activeTab === "expenses" && expenseActionsLoading)}
                      style={(!can("export_cash_management_csv") || !can("export_csv")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                editDisabled={!can("edit_expense")}
                deleteDisabled={!can("delete_expense")}
                sharedDateFilter={dateRange.preset}
                sharedDateFrom={dateRange.startDate}
                sharedDateTo={dateRange.endDate}
                // onFilteredCountChange={setExpenseTabCount}
                onExportDataChange={setExportDataset}
                onEdit={openExpenseEdit}
                onDelete={(expense) => {
                  if (expenseActionsLoading) return;
                  if (!can("delete_expense")) { denyPerm("delete_expense"); return; }
                  setDeletingExpense(expense);
                }}
              />
            ) : null}
          </div>
        </section>
      </div>

      <OpenCounterModal
        // Chained open-after-close (see the close-counter onSubmit below)
        // calls setShowOpenModal(true) in the same tick as the "Counter
        // closed" success confirmation — without this guard the Open Counter
        // form would render directly on top of that message. It simply
        // appears once the overlay clears instead.
        show={showOpenModal && !counterStatusOverlay}
        loading={loading.openCounter}
        mandatory={needsOpenCounter}
        onLogout={handleLogout}
        onClose={() => setShowOpenModal(false)}
        onSubmit={async (payload) => {
          await openCounter(payload);
          setShowOpenModal(false);
          showGlobalToast("success", "Counter opened", "Counter opened successfully.");
        }}
        onNotify={(tone, message) => {
          if (tone === "error") showCounterError(message);
          else showCounterSuccess(message);
        }}
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
        onLogout={handleLogout}
        onClose={() => setShowCloseModal(false)}
        onSubmit={async (payload) => {
          const closed = await closeCounter(payload);
          try {
            // closed/dashboard already carry split-aware upiAmount/cardAmount
            // straight from the cashdashboard endpoint — DailySummaryData
            // prefers those over paymentCounts.amounts (see its comment), so
            // no separate fetch is needed to build this payload.
            await sendDailySummaryEmail(
              dashboard.cashManagementId,
              closed || dashboard,
              userEmail,
            );
          } catch (emailErr) {
            console.error("[CashManagementPage] Daily summary email error:", emailErr);
          }
          setShowCloseModal(false);
          // Only chain straight into Open Counter when this close was clearing a
          // stale counter left open from a previous day — that leaves today with
          // no counter open yet, so immediately prompting to start today's is
          // correct. A normal same-day close must NOT do this: the backend only
          // allows one open per day, so re-showing Open Counter here would just
          // dead-end the user on a form that fails every time they submit it.
          if (isStaleOpenCounter) setShowOpenModal(true);
          showGlobalToast("success", "Counter closed", "Counter closed. Daily summary emailed to Salon Owner.");
        }}
        onNotify={(tone, message) => {
          if (tone === "error") showCounterError(message);
          else showCounterSuccess(message);
        }}
      />
    </div>
  );
}
