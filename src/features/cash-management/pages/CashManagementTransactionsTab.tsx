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

type SortKey =
  | "date"
  | "openedAt"
  | "closedAt"
  | "openingBalance"
  | "cashRevenue"
  | "cashExpense"
  | "inStoreCash"
  | "closingBalance"
  | "reconciliationAmount";

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
  const [sortKey, setSortKey] = useState<SortKey>("openedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewingIncomeFor, setViewingIncomeFor] = useState<CashTransactionRecord | null>(null);

  const sessionStatus = (session: CashTransactionRecord): SessionStatus =>
    session.closedAt ? "closed" : "open";

  const filtered = useMemo(() => {
    return rows
      .filter((session) => {
        const query = search.trim().toLowerCase();
        const anchor = session.openedAt ?? session.date;
        const anchorDate = anchor ? new Date(anchor) : null;

        if (status !== "all" && sessionStatus(session) !== status) return false;
        if (sharedDateFrom && anchorDate && anchorDate < new Date(`${sharedDateFrom}T00:00:00`)) return false;
        if (sharedDateTo && anchorDate && anchorDate > new Date(`${sharedDateTo}T23:59:59`)) return false;
        if (!query) return true;

        return [session.id, session.createdBy ?? "", session.closedBy ?? "", session.remarks ?? ""].some(
          (value) => String(value).toLowerCase().includes(query),
        );
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "date" || sortKey === "openedAt") {
          const leftTime = new Date(left.openedAt ?? left.date ?? "").getTime() || 0;
          const rightTime = new Date(right.openedAt ?? right.date ?? "").getTime() || 0;
          return (leftTime - rightTime) * invert;
        }
        if (sortKey === "closedAt") {
          const leftTime = new Date(left.closedAt ?? "").getTime() || 0;
          const rightTime = new Date(right.closedAt ?? "").getTime() || 0;
          return (leftTime - rightTime) * invert;
        }
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * invert;
        }
        return String(leftValue).localeCompare(String(rightValue)) * invert;
      });
  }, [rows, search, sharedDateFrom, sharedDateTo, sortDirection, sortKey, status]);

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
        "Open Time",
        "Close Time",
        `Opening Balance (${currencySymbol})`,
        `Cash Revenue (${currencySymbol})`,
        `Cash Expense (${currencySymbol})`,
        `Closing Balance (${currencySymbol})`,
        `In-Store Cash (${currencySymbol})`,
        `Reconciliation Amount (${currencySymbol})`,
      ],
      rows: filtered.map((session) => {
        const anchor = session.openedAt ?? session.date;
        const isClosed = Boolean(session.closedAt);
        return [
          anchor ? formatDateDDMMYYYY(new Date(anchor)) : "--",
          formatTime(anchor),
          isClosed ? formatTime(session.closedAt) : "--",
          formatAmount(session.openingBalance ?? 0),
          isClosed ? formatAmount(session.cashRevenue ?? 0) : "--",
          isClosed ? formatAmount(session.cashExpense ?? 0) : "--",
          isClosed ? formatAmount(session.closingBalance ?? 0) : "--",
          isClosed ? formatAmount(session.inStoreCash ?? 0) : "--",
          isClosed ? formatAmount(session.reconciliationAmount ?? 0) : "--",
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
                ["openedAt", "Open Time"],
                ["closedAt", "Close Time"],
                ["openingBalance", "Opening Balance"],
                ["cashRevenue", "Cash Revenue"],
                ["cashExpense", "Cash Expense"],
                ["inStoreCash", "In Store Cash"],
                ["closingBalance", "Closing Balance"],
                ["reconciliationAmount", "Reconciliation Amount"],
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
            {paged.map((session) => {
              const anchor = session.openedAt ?? session.date;
              const isClosed = Boolean(session.closedAt);

              return (
                <tr key={session.id}>
                  <td>
                    <button
                      type="button"
                      className="cash-mgmt__table-link"
                      onClick={() => setViewingIncomeFor(session)}
                      title="View individual cash payments"
                    >
                      <FormattedDate value={anchor} fallback="--" />
                    </button>
                  </td>
                  <td>
                    <span className="cash-mgmt__time-badge cash-mgmt__time-badge--open">
                      {formatTime(anchor)}
                    </span>
                  </td>
                  <td>
                    {isClosed ? (
                      <span className="cash-mgmt__time-badge cash-mgmt__time-badge--closed">
                        {formatTime(session.closedAt)}
                      </span>
                    ) : (
                      <span className="cash-mgmt__time-badge cash-mgmt__time-badge--pending">--</span>
                    )}
                  </td>
                  <td>{formatAmount(session.openingBalance)}</td>
                  <td>
                    {isClosed ? (
                      <button
                        type="button"
                        className="cash-mgmt__table-link"
                        onClick={() => setViewingIncomeFor(session)}
                        title="View individual cash payments"
                      >
                        {formatAmount(session.cashRevenue)}
                      </button>
                    ) : (
                      "--"
                    )}
                  </td>
                  <td>{isClosed ? formatAmount(session.cashExpense) : "--"}</td>
                  <td>{isClosed ? formatAmount(session.inStoreCash) : "--"}</td>
                  <td>{isClosed ? formatAmount(session.closingBalance) : "--"}</td>
                  <td
                    className={
                      !isClosed
                        ? undefined
                        : session.reconciliationAmount >= 0
                          ? "cash-mgmt__amount-positive"
                          : "cash-mgmt__amount-negative"
                    }
                  >
                    {isClosed ? formatAmount(session.reconciliationAmount) : "--"}
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
