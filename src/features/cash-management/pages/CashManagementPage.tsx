import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CashStack,
  ChevronDown,
  CheckCircle,
  JournalText,
  PlusCircle,
  Safe2,
  Wallet2,
} from "react-bootstrap-icons";
import { Button, Tabs } from "../../../components/ui";
import type {
  CashManagementExportDataset,
  CashManagementExportFormat,
} from "../cashManagement.export";
import {
  exportCashManagementCSV,
  exportCashManagementExcel,
  exportCashManagementPDF,
} from "../cashManagement.export";
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
import "../styles/CashManagementPage.scss";

type ActiveTab = "transactions" | "expenses";
type SharedDateFilterKey = "today" | "yesterday" | "week" | "month" | "all" | "custom";
type NotificationState = {
  tone: CashManagementNotificationTone;
  message: string;
} | null;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

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
  const {
    dashboard,
    transactions,
    expenses,
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
  const [sharedDateFilter, setSharedDateFilter] = useState<SharedDateFilterKey>("today");
  const [sharedDateFrom, setSharedDateFrom] = useState(() => formatDateInput(new Date()));
  const [sharedDateTo, setSharedDateTo] = useState(() => formatDateInput(new Date()));
  const [expenseActionLoading, setExpenseActionLoading] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const expenseActionsLoading =
    expenseActionLoading || loading.saveExpense || loading.deleteExpense;


  const transactionTabCount = useMemo(() => {
    return transactions.filter((item) => isInDateRange(item.updatedAt ?? item.date, sharedDateFrom, sharedDateTo)).length;
  }, [transactions, sharedDateFrom, sharedDateTo]);

  const expenseTabCount = useMemo(() => {
    return expenses.filter((item) => isInDateRange(item.updatedAt ?? item.expenseDate, sharedDateFrom, sharedDateTo)).length;
  }, [expenses, sharedDateFrom, sharedDateTo]);


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
        label: "Opening Balance",
        value: formatCurrency(summaryDashboard.openingBalance),
        icon: <Wallet2 size={18} />,
        tone: "primary",
      },
      {
        label: "Cash Revenue",
        value: formatCurrency(summaryDashboard.cashRevenue),
        icon: <CashStack size={18} />,
        tone: "success",
      },
      {
        label: "Cash Expense",
        value: formatCurrency(summaryDashboard.cashExpense),
        icon: <JournalText size={18} />,
        tone: "warning",
      },
      {
        label: "Closing Balance",
        value: formatCurrency(summaryDashboard.closingBalance),
        icon: <Safe2 size={18} />,
        tone: "dark",
      },
      {
        label: "In Store Cash",
        value: formatCurrency(summaryDashboard.inStoreCash),
        icon: <CheckCircle size={18} />,
        tone: "info",
      },
      {
        label: "Reconciliation Amount",
        value: formatCurrency(summaryDashboard.reconciliationAmount),
        icon: <Safe2 size={18} />,
        tone:
          summaryDashboard.reconciliationAmount === 0
            ? "neutral"
            : summaryDashboard.reconciliationAmount > 0
              ? "success"
              : "danger",
      },
    ],
    [summaryDashboard],
  );

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
    setEditingExpense(null);
    setShowExpenseModal(true);
  };

  const openExpenseEdit = (expense: CashExpenseRecord) => {
    if (expenseActionsLoading) return;
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };


  const applySharedDateFilter = (value: SharedDateFilterKey) => {
    const currentDate = new Date();
    const current = new Date(currentDate);

    if (value === "all") {
      setSharedDateFrom("");
      setSharedDateTo("");
      setSharedDateFilter(value);
      return;
    }

    if (value === "custom") {
      setSharedDateFilter(value);
      return;
    }

    if (value === "today") {
      const formatted = formatDateInput(current);
      setSharedDateFrom(formatted);
      setSharedDateTo(formatted);
    } else if (value === "yesterday") {
      current.setDate(current.getDate() - 1);
      const formatted = formatDateInput(current);
      setSharedDateFrom(formatted);
      setSharedDateTo(formatted);
    } else if (value === "week") {
      const end = formatDateInput(currentDate);
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      setSharedDateFrom(formatDateInput(startDate));
      setSharedDateTo(end);
    } else if (value === "month") {
      const end = formatDateInput(currentDate);
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 29);
      setSharedDateFrom(formatDateInput(startDate));
      setSharedDateTo(end);
    }

    setSharedDateFilter(value);
  };

  const refreshActiveTab = async () => {
    if (activeTab === "transactions") {
      await refreshTransactions();
      return;
    }
    await refreshExpenses();
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
              disabled={!activeCounterClosed}
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
            <Button
              variant="outline-dark"
              iconLeft={<ArrowClockwise size={14} />}
              onClick={async () => {
                await refreshDashboard();
              }}
              loading={loading.dashboard}
            >
              Refresh
            </Button>
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


        <section className="cash-mgmt__surface">
          <div className="cash-mgmt__surface-header">
            <div className="cash-mgmt__surface-copy">
              <h2 className="cash-mgmt__surface-title">Daily Cash Flow</h2>
             
            </div>
          </div>

          <div className="cash-mgmt__surface-controls">
            <div className="cash-mgmt__shared-filter-bar">
              <div className="cash-mgmt__shared-filter-group">
                <span className="cash-mgmt__shared-filter-label">Date Filter</span>
                <div className="cash-mgmt__tab-toolbar-group">
                  <div className="cash-mgmt__shared-filter-select-wrap">
                    <select
                      className="cash-mgmt__shared-filter-select"
                      value={sharedDateFilter}
                      onChange={(event) =>
                        applySharedDateFilter(event.target.value as SharedDateFilterKey)
                      }
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                      <option value="all">All time</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    <ChevronDown size={12} className="cash-mgmt__shared-filter-select-icon" />
                  </div>
                  {sharedDateFilter === "custom" ? (
                    <>
                      <input
                        className="cash-mgmt__shared-filter-date"
                        type="date"
                        value={sharedDateFrom}
                        onChange={(event) => setSharedDateFrom(event.target.value)}
                      />
                      <input
                        className="cash-mgmt__shared-filter-date"
                        type="date"
                        value={sharedDateTo}
                        onChange={(event) => setSharedDateTo(event.target.value)}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="cash-mgmt__surface-actions">
              <Button
                variant="outline-dark"
                iconLeft={<ArrowClockwise size={14} />}
                onClick={async () => {
                  await refreshActiveTab();
                }}
                disabled={activeTab === "expenses" && expenseActionsLoading}
                loading={
                  activeTab === "transactions"
                    ? loading.transactions
                    : loading.expenses
                }
              >
                Refresh
              </Button>

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
                sharedDateFilter={sharedDateFilter}
                sharedDateFrom={sharedDateFrom}
                sharedDateTo={sharedDateTo}
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
                sharedDateFilter={sharedDateFilter}
                sharedDateFrom={sharedDateFrom}
                sharedDateTo={sharedDateTo}
                // onFilteredCountChange={setExpenseTabCount}
                onExportDataChange={setExportDataset}
                onAdd={openExpenseCreate}
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
        onClose={() => setShowCloseModal(false)}
        onSubmit={async (payload) => {
          await closeCounter(payload);
          setShowCloseModal(false);
          showNotification("success", "Counter closed successfully.");
        }}
        onNotify={showNotification}
      />
    </div>
  );
}
