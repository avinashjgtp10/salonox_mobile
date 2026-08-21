import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { FormattedDate, Pagination } from "../../../components/ui";
import type { DateRangePreset } from "../../../components/ui";
import type { CashManagementExportDataset } from "../cashManagement.export";
import type { CashTransactionRecord } from "../cashManagement.types";
import { useCurrency } from "../../../hooks/useCurrency";
import CashMgmtFilterSelect from "../components/CashMgmtFilterSelect";
import CashIncomeModal from "../components/CashIncomeModal";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

interface Props {
  rows: CashTransactionRecord[];
  loading?: boolean;
  counterClosed?: boolean;
  sharedDateFilter: DateRangePreset;
  sharedDateFrom: string;
  sharedDateTo: string;
  onFilteredCountChange?: (count: number) => void;
  onExportDataChange?: (dataset: CashManagementExportDataset) => void;
}

type SessionStatus = "open" | "closed";
type CounterHistoryEvent = SessionStatus;

interface CounterHistoryRow {
  id: string;
  session: CashTransactionRecord;
  event: CounterHistoryEvent;
  eventAt: string | null;
  openingBalance: number;
  cashRevenue: number;
  cashExpense: number;
  inStoreCash: number;
  closingBalance: number;
  reconciliationAmount: number;
}

type SortKey =
  | "date"
  | "openingBalance"
  | "cashRevenue"
  | "cashExpense"
  | "inStoreCash"
  | "closingBalance"
  | "reconciliationAmount"
  | "status";

const formatTime = (value: string | null | undefined) => {
  if (!value) return "--";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return "--";
  return next.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function CashManagementTransactionsTab({
  rows,
  loading = false,
  sharedDateFilter,
  sharedDateFrom,
  sharedDateTo,
  onFilteredCountChange,
  onExportDataChange,
}: Props) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SessionStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewingIncomeFor, setViewingIncomeFor] = useState<CashTransactionRecord | null>(null);

  const historyRows = useMemo<CounterHistoryRow[]>(() => {
    return rows.flatMap((session) => {
      const openedAt = session.openedAt ?? session.date ?? null;
      const openRow: CounterHistoryRow = {
        id: `${session.id || openedAt || "session"}-open`,
        session,
        event: "open",
        eventAt: openedAt,
        openingBalance: session.openingBalance,
        cashRevenue: 0,
        cashExpense: 0,
        inStoreCash: 0,
        closingBalance: session.openingBalance,
        reconciliationAmount: 0,
      };

      if (!session.closedAt) return [openRow];

      const closeRow: CounterHistoryRow = {
        id: `${session.id || session.closedAt}-closed`,
        session,
        event: "closed",
        eventAt: session.closedAt,
        openingBalance: session.openingBalance,
        cashRevenue: session.cashRevenue,
        cashExpense: session.cashExpense,
        inStoreCash: session.inStoreCash,
        closingBalance: session.closingBalance,
        reconciliationAmount: session.reconciliationAmount,
      };

      return [openRow, closeRow];
    });
  }, [rows]);

  const filtered = useMemo(() => {
    return historyRows
      .filter((row) => {
        const { session } = row;
        const query = search.trim().toLowerCase();
        const anchorDate = row.eventAt ? new Date(row.eventAt) : null;

        if (status !== "all" && row.event !== status) return false;
        if (sharedDateFrom && anchorDate && anchorDate < new Date(`${sharedDateFrom}T00:00:00`)) return false;
        if (sharedDateTo && anchorDate && anchorDate > new Date(`${sharedDateTo}T23:59:59`)) return false;
        if (!query) return true;

        return [session.id, row.event, session.createdBy ?? "", session.closedBy ?? "", session.remarks ?? ""].some(
          (value) => String(value).toLowerCase().includes(query),
        );
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "date") {
          const leftTime = new Date(left.eventAt ?? "").getTime() || 0;
          const rightTime = new Date(right.eventAt ?? "").getTime() || 0;
          return (leftTime - rightTime) * invert;
        }
        if (sortKey === "status") {
          return left.event.localeCompare(right.event) * invert;
        }
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * invert;
        }
        return String(leftValue).localeCompare(String(rightValue)) * invert;
      });
  }, [historyRows, search, sharedDateFrom, sharedDateTo, sortDirection, sortKey, status]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

   useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);


  useEffect(() => {
    const appliedFilters = [
      search.trim() ? `Search: ${search.trim()}` : "",
      status !== "all" ? `Status: ${status}` : "",
      sharedDateFilter !== "all_time" ? `Range: ${sharedDateFilter}` : "",
      sharedDateFrom ? `Date From: ${sharedDateFrom}` : "",
      sharedDateTo ? `Date To: ${sharedDateTo}` : "",
      `Sort: ${sortKey} (${sortDirection})`,
    ].filter(Boolean);

    onExportDataChange?.({
      title: "Transactions",
      columns: [
        "Date",
        `Opening Balance (${currencySymbol})`,
        `Cash Revenue (${currencySymbol})`,
        `Cash Expense (${currencySymbol})`,
        `In-Store Cash (${currencySymbol})`,
        `Closing Balance (${currencySymbol})`,
        `Reconciliation Amount (${currencySymbol})`,
        "Status",
      ],
      rows: filtered.map((row) => {
        return [
          row.eventAt ? `${formatDateDDMMYYYY(new Date(row.eventAt))}, ${formatTime(row.eventAt)}` : "--",
          formatAmount(row.openingBalance ?? 0),
          formatAmount(row.cashRevenue ?? 0),
          formatAmount(row.cashExpense ?? 0),
          formatAmount(row.inStoreCash ?? 0),
          formatAmount(row.closingBalance ?? 0),
          formatAmount(row.reconciliationAmount ?? 0),
          row.event,
        ];
      }),
      appliedFilters,
      totalRecords: filtered.length,
    });
  }, [
    filtered,
    onExportDataChange,
    search,
    sharedDateFilter,
    sharedDateFrom,
    sharedDateTo,
    sortDirection,
    sortKey,
    status,
    currencySymbol,
    formatAmount,
  ]);

  return (
    <div className="cash-mgmt__tab-panel">
      <div className="cash-mgmt__section-header">
        <div className="cash-mgmt__section-copy">
          <h3 className="cash-mgmt__section-title">Transactions</h3>
        </div>
      </div>

      <div className="cash-mgmt__tab-toolbar">
        <div className="cash-mgmt__tab-search">
          <Search size={14} className="cash-mgmt__tab-search-icon" />
          <input
            className="cash-mgmt__field cash-mgmt__search-input"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by creator, status "
          />
        </div>
        <div className="cash-mgmt__tab-toolbar-group">
          <CashMgmtFilterSelect
            value={status}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => {
              setStatus(value as "all" | SessionStatus);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="cash-mgmt__table-shell">
        <table className="cash-mgmt__table">
          <thead>
            <tr>
              {[
                ["date", "Date"],
                ["openingBalance", "Opening Balance"],
                ["cashRevenue", "Cash Revenue"],
                ["cashExpense", "Cash Expense"],
                ["inStoreCash", "In Store Cash"],
                ["closingBalance", "Closing Balance"],
                ["reconciliationAmount", "Reconciliation Amount"],
                ["status", "Status"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button
                    type="button"
                    className="cash-mgmt__table-sort"
                    onClick={() => toggleSort(key as SortKey)}
                  >
                    {label}
                    {sortKey === key ? (
                      sortDirection === "asc" ? (
                        <SortUp size={12} />
                      ) : (
                        <SortDown size={12} />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="cash-mgmt__empty-state">
                    <h3 className="cash-mgmt__empty-title">No transactions found</h3>
                    <p className="cash-mgmt__empty-text">
                      Try adjusting your filters or open a new counter to start tracking cash movement.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {paged.map((row) => {
              return (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="cash-mgmt__table-link"
                      onClick={() => setViewingIncomeFor(row.session)}
                      title="View individual cash payments"
                    >
                      <span className="cash-mgmt__detail-cell">
                        <FormattedDate value={row.eventAt} fallback="--" />
                        <span className="cash-mgmt__detail-time">{formatTime(row.eventAt)}</span>
                      </span>
                    </button>
                  </td>
                  <td>{formatAmount(row.openingBalance)}</td>
                  <td>
                    {row.event === "closed" ? (
                      <button
                        type="button"
                        className="cash-mgmt__table-link"
                        onClick={() => setViewingIncomeFor(row.session)}
                        title="View individual cash payments"
                      >
                        {formatAmount(row.cashRevenue)}
                      </button>
                    ) : (
                      formatAmount(row.cashRevenue)
                    )}
                  </td>
                  <td>{formatAmount(row.cashExpense)}</td>
                  <td>{formatAmount(row.inStoreCash)}</td>
                  <td>{formatAmount(row.closingBalance)}</td>
                  <td
                    className={
                      row.event === "open"
                        ? undefined
                        : row.reconciliationAmount >= 0
                          ? "cash-mgmt__amount-positive"
                          : "cash-mgmt__amount-negative"
                    }
                  >
                    {formatAmount(row.reconciliationAmount)}
                  </td>
                  <td>
                    <span className={`cash-mgmt__status-pill cash-mgmt__status-pill--${row.event}`}>
                      {row.event}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        className="cash-mgmt__pagination"
      />

      <CashIncomeModal
        show={Boolean(viewingIncomeFor)}
        cashManagementId={viewingIncomeFor?.id ?? null}
        onClose={() => setViewingIncomeFor(null)}
      />
    </div>
  );
}
