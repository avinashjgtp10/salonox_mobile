import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
import type { CashManagementExportDataset } from "../cashManagement.export";
import type { CashCounterStatus, CashTransactionRecord } from "../cashManagement.types";
import { useCurrency } from "../../../hooks/useCurrency";

interface Props {
  rows: CashTransactionRecord[];
  loading?: boolean;
  counterClosed?: boolean;
  sharedDateFilter: "today" | "yesterday" | "week" | "month" | "all" | "custom";
  sharedDateFrom: string;
  sharedDateTo: string;
  onFilteredCountChange?: (count: number) => void;
  onExportDataChange?: (dataset: CashManagementExportDataset) => void;
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

const formatDate = (value: string) => {
  if (!value) return "--";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return value;
  return next.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};


const parseUtcDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T").replace(/\+00$/, "Z");
  const next = new Date(normalized);
  return Number.isNaN(next.getTime()) ? null : next;
};

const formatStatusTime = (value?: string | null) => {
  const next = parseUtcDate(value);
  if (!next) return null;
  return next.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
  const [status, setStatus] = useState<"all" | CashCounterStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const getRowDisplayDate = (row: CashTransactionRecord) => row.updatedAt ?? row.date;

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        const query = search.trim().toLowerCase();
        const rowDateValue = getRowDisplayDate(row);
        const rowDate = rowDateValue ? new Date(rowDateValue) : null;

        if (status !== "all" && row.status !== status) return false;
        if (sharedDateFrom && rowDate && rowDate < new Date(`${sharedDateFrom}T00:00:00`)) return false;
        if (sharedDateTo && rowDate && rowDate > new Date(`${sharedDateTo}T23:59:59`)) return false;
        if (!query) return true;

        return [row.id, row.status, row.remarks ?? ""].some((value) =>
          String(value).toLowerCase().includes(query),
        );
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "date") {
          return (new Date(getRowDisplayDate(left)).getTime() - new Date(getRowDisplayDate(right)).getTime()) * invert;
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
    setSortDirection(key === "status" ? "asc" : "desc");
  };

  const getStatusTime = (row: CashTransactionRecord) => {
    if (row.status === "open") return formatStatusTime(row.openedAt);
    if (row.status === "closed") return formatStatusTime(row.closedAt);
    return null;
  };

   useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);


  useEffect(() => {
    const appliedFilters = [
      search.trim() ? `Search: ${search.trim()}` : "",
      status !== "all" ? `Status: ${status}` : "",
      sharedDateFilter !== "all" ? `Range: ${sharedDateFilter}` : "",
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
        `Closing Balance (${currencySymbol})`,
        `In-Store Cash (${currencySymbol})`,
        `Reconciliation Amount (${currencySymbol})`,
        "Status",
      ],
      rows: filtered.map((row) => {
        const statusTime = getStatusTime(row);
        const statusValue = row.status === "open" ? "Open" : "Closed";
        return [
          formatDate(getRowDisplayDate(row)),
          formatAmount(row.openingBalance ?? 0),
          formatAmount(row.cashRevenue ?? 0),
          formatAmount(row.cashExpense ?? 0),
          formatAmount(row.closingBalance ?? 0),
          formatAmount(row.inStoreCash ?? 0),
          formatAmount(row.reconciliationAmount ?? 0),
          statusTime ? `${statusValue} (${statusTime})` : statusValue,
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
          <select
            className="cash-mgmt__field cash-mgmt__filter-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
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
                <td colSpan={8}>
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
              const statusTime = getStatusTime(row);
              const isOpen = row.status === "open";

              return (
                <tr key={row.id}>
                  <td>{formatDate(getRowDisplayDate(row))}</td>
                  <td>{formatAmount(row.openingBalance)}</td>
                  <td>{formatAmount(row.cashRevenue)}</td>
                  <td>{formatAmount(row.cashExpense)}</td>
                  <td>{formatAmount(row.inStoreCash)}</td>
                  <td>{formatAmount(row.closingBalance)}</td>
                  <td
                    className={
                      row.reconciliationAmount >= 0
                        ? "cash-mgmt__amount-positive"
                        : "cash-mgmt__amount-negative"
                    }
                  >
                    {formatAmount(row.reconciliationAmount)}
                  </td>
                  <td>
                    <div className="cash-mgmt__status-cell">
                      <span
                        className={`cash-mgmt__status-pill ${
                          isOpen
                            ? "cash-mgmt__status-pill--open"
                            : "cash-mgmt__status-pill--closed"
                        }`}
                      >
                        {isOpen ? "Open" : "Closed"}
                      </span>
                      {statusTime ? (
                        <span className="cash-mgmt__status-time">{statusTime}</span>
                      ) : null}
                    </div>
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
    </div>
  );
}
