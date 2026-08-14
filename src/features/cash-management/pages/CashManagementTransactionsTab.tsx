import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
import type { CashManagementExportDataset } from "../cashManagement.export";
import type { CashCounterStatus, CashTransactionRecord } from "../cashManagement.types";
import { useCurrency } from "../../../hooks/useCurrency";
import CashMgmtFilterSelect from "../components/CashMgmtFilterSelect";
import CashIncomeModal from "../components/CashIncomeModal";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

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
  | "openedAt"
  | "closedAt"
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
  const [sortKey, setSortKey] = useState<SortKey>("openedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewingIncomeFor, setViewingIncomeFor] = useState<CashTransactionRecord | null>(null);

  const getRowDisplayDate = (row: CashTransactionRecord) => row.openedAt ?? row.date;

  // Open counters have no closedAt yet — pushed to the tail of either sort
  // direction (treated as "latest possible") rather than sorting as if they
  // closed at epoch 0, which would otherwise float them to the very top of
  // an ascending sort.
  const timeOrEnd = (value: string | null) => (value ? new Date(value).getTime() : Number.POSITIVE_INFINITY);

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
        if (sortKey === "openedAt") {
          return (timeOrEnd(left.openedAt) - timeOrEnd(right.openedAt)) * invert;
        }
        if (sortKey === "closedAt") {
          return (timeOrEnd(left.closedAt) - timeOrEnd(right.closedAt)) * invert;
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
        "Opened At",
        "Closed At",
        `Opening Balance (${currencySymbol})`,
        `Cash Revenue (${currencySymbol})`,
        `Cash Expense (${currencySymbol})`,
        `Closing Balance (${currencySymbol})`,
        `In-Store Cash (${currencySymbol})`,
        `Reconciliation Amount (${currencySymbol})`,
        "Status",
      ],
      rows: filtered.map((row) => {
        const statusValue = row.status === "open" ? "Open" : "Closed";
        return [
          formatDate(row.openedAt ?? row.date),
          row.closedAt ? formatDate(row.closedAt) : "--",
          formatAmount(row.openingBalance ?? 0),
          formatAmount(row.cashRevenue ?? 0),
          formatAmount(row.cashExpense ?? 0),
          formatAmount(row.closingBalance ?? 0),
          formatAmount(row.inStoreCash ?? 0),
          formatAmount(row.reconciliationAmount ?? 0),
          statusValue,
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
          <CashMgmtFilterSelect
            value={status}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => {
              setStatus(value as "all" | CashCounterStatus);
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
                ["openedAt", "Opened At"],
                ["closedAt", "Closed At"],
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
              const isOpen = row.status === "open";

              return (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className="cash-mgmt__table-link"
                      onClick={() => setViewingIncomeFor(row)}
                      title="View individual cash payments"
                    >
                      {formatDate(row.openedAt ?? row.date)}
                    </button>
                  </td>
                  <td>{row.closedAt ? formatDate(row.closedAt) : "--"}</td>
                  <td>{formatAmount(row.openingBalance)}</td>
                  <td>
                    <button
                      type="button"
                      className="cash-mgmt__table-link"
                      onClick={() => setViewingIncomeFor(row)}
                      title="View individual cash payments"
                    >
                      {formatAmount(row.cashRevenue)}
                    </button>
                  </td>
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
                    <span
                      className={`cash-mgmt__status-pill ${
                        isOpen
                          ? "cash-mgmt__status-pill--open"
                          : "cash-mgmt__status-pill--closed"
                      }`}
                    >
                      {isOpen ? "Open" : "Closed"}
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
