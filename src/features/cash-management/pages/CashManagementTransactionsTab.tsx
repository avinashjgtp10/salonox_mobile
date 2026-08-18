import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
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

// Each counter session becomes TWO rows here — one for the Open event, one
// for the Close event (once it has one) — rather than a single row with both
// an "Opened At" and "Closed At" column. That's what lets a session that was
// opened on one calendar day and closed on the next show up correctly under
// each day's own date filter, and matches the "Day 1 Open / Day 1 Close /
// Day 2 Open / ..." history shape this table is meant to read as.
type EventKind = "open" | "close";

interface EventRow {
  key: string;
  session: CashTransactionRecord;
  event: EventKind;
  dateTime: string;
}

type SortKey =
  | "dateTime"
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
  const time = next.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${formatDateDDMMYYYY(next)} ${time}`;
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
  const [status, setStatus] = useState<"all" | EventKind>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewingIncomeFor, setViewingIncomeFor] = useState<CashTransactionRecord | null>(null);

  const allEventRows = useMemo<EventRow[]>(() => {
    const out: EventRow[] = [];
    for (const session of rows) {
      const openedAt = session.openedAt ?? session.date;
      if (openedAt) {
        out.push({ key: `${session.id}-open`, session, event: "open", dateTime: openedAt });
      }
      if (session.closedAt) {
        out.push({ key: `${session.id}-close`, session, event: "close", dateTime: session.closedAt });
      }
    }
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    return allEventRows
      .filter((row) => {
        const query = search.trim().toLowerCase();
        const rowDate = row.dateTime ? new Date(row.dateTime) : null;

        if (status !== "all" && row.event !== status) return false;
        if (sharedDateFrom && rowDate && rowDate < new Date(`${sharedDateFrom}T00:00:00`)) return false;
        if (sharedDateTo && rowDate && rowDate > new Date(`${sharedDateTo}T23:59:59`)) return false;
        if (!query) return true;

        return [row.session.id, row.event, row.session.remarks ?? ""].some((value) =>
          String(value).toLowerCase().includes(query),
        );
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "dateTime") {
          return (new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime()) * invert;
        }
        if (sortKey === "status") {
          return left.event.localeCompare(right.event) * invert;
        }
        const leftValue = left.session[sortKey];
        const rightValue = right.session[sortKey];
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * invert;
        }
        return String(leftValue).localeCompare(String(rightValue)) * invert;
      });
  }, [allEventRows, search, sharedDateFrom, sharedDateTo, sortDirection, sortKey, status]);

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
      sharedDateFilter !== "all_time" ? `Range: ${sharedDateFilter}` : "",
      sharedDateFrom ? `Date From: ${sharedDateFrom}` : "",
      sharedDateTo ? `Date To: ${sharedDateTo}` : "",
      `Sort: ${sortKey} (${sortDirection})`,
    ].filter(Boolean);

    onExportDataChange?.({
      title: "Transactions",
      columns: [
        "Date & Time",
        "Status",
        `Opening Balance (${currencySymbol})`,
        `Cash Revenue (${currencySymbol})`,
        `Cash Expense (${currencySymbol})`,
        `Closing Balance (${currencySymbol})`,
        `In-Store Cash (${currencySymbol})`,
        `Reconciliation Amount (${currencySymbol})`,
      ],
      rows: filtered.map((row) => {
        const isOpenRow = row.event === "open";
        return [
          formatDate(row.dateTime),
          isOpenRow ? "Open" : "Closed",
          formatAmount(row.session.openingBalance ?? 0),
          isOpenRow ? "--" : formatAmount(row.session.cashRevenue ?? 0),
          isOpenRow ? "--" : formatAmount(row.session.cashExpense ?? 0),
          isOpenRow ? "--" : formatAmount(row.session.closingBalance ?? 0),
          isOpenRow ? "--" : formatAmount(row.session.inStoreCash ?? 0),
          isOpenRow ? "--" : formatAmount(row.session.reconciliationAmount ?? 0),
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
              setStatus(value as "all" | EventKind);
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
                ["dateTime", "Date & Time"],
                ["status", "Status"],
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
              const isOpenRow = row.event === "open";
              const session = row.session;

              return (
                <tr key={row.key}>
                  <td>
                    <button
                      type="button"
                      className="cash-mgmt__table-link"
                      onClick={() => setViewingIncomeFor(session)}
                      title="View individual cash payments"
                    >
                      {formatDate(row.dateTime)}
                    </button>
                  </td>
                  <td>
                    <span
                      className={`cash-mgmt__status-pill ${
                        isOpenRow
                          ? "cash-mgmt__status-pill--open"
                          : "cash-mgmt__status-pill--closed"
                      }`}
                    >
                      {isOpenRow ? "Open" : "Closed"}
                    </span>
                  </td>
                  <td>{formatAmount(session.openingBalance)}</td>
                  <td>
                    {isOpenRow ? (
                      "--"
                    ) : (
                      <button
                        type="button"
                        className="cash-mgmt__table-link"
                        onClick={() => setViewingIncomeFor(session)}
                        title="View individual cash payments"
                      >
                        {formatAmount(session.cashRevenue)}
                      </button>
                    )}
                  </td>
                  <td>{isOpenRow ? "--" : formatAmount(session.cashExpense)}</td>
                  <td>{isOpenRow ? "--" : formatAmount(session.inStoreCash)}</td>
                  <td>{isOpenRow ? "--" : formatAmount(session.closingBalance)}</td>
                  <td
                    className={
                      isOpenRow
                        ? undefined
                        : session.reconciliationAmount >= 0
                          ? "cash-mgmt__amount-positive"
                          : "cash-mgmt__amount-negative"
                    }
                  >
                    {isOpenRow ? "--" : formatAmount(session.reconciliationAmount)}
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
