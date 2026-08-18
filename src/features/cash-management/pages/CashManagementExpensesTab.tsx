import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
import type { DateRangePreset } from "../../../components/ui";
import type { CashManagementExportDataset } from "../cashManagement.export";
import type { CashExpenseRecord } from "../cashManagement.types";
import { useCurrency } from "../../../hooks/useCurrency";
import CashMgmtFilterSelect from "../components/CashMgmtFilterSelect";
import CashMgmtRowActionsMenu from "../components/CashMgmtRowActionsMenu";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

const ALL_EXPENSE_TYPES = "all";

interface Props {
  rows: CashExpenseRecord[];
  loading?: boolean;
  canManage: boolean;
  actionsDisabled?: boolean;
  sharedDateFilter: DateRangePreset;
  sharedDateFrom: string;
  sharedDateTo: string;
  onFilteredCountChange?: (count: number) => void;
  onExportDataChange?: (dataset: CashManagementExportDataset) => void;
  onEdit: (expense: CashExpenseRecord) => void;
  onDelete: (expense: CashExpenseRecord) => void;
}

type SortKey = "expenseDate" | "expenseType" | "description" | "amount";

const formatDate = (value: string) => {
  if (!value) return "--";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return value;
  return formatDateDDMMYYYY(next);
};


const parseUtcDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T").replace(/\+00$/, "Z");
  const next = new Date(normalized);
  return Number.isNaN(next.getTime()) ? null : next;
};

const formatTime = (value?: string | null) => {
  const next = parseUtcDate(value);
  if (!next) return null;
  return next.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function CashManagementExpensesTab({
  rows,
  loading = false,
  canManage,
  actionsDisabled = false,
  sharedDateFilter,
  sharedDateFrom,
  sharedDateTo,
  onFilteredCountChange,
  onExportDataChange,
  onEdit,
  onDelete,
}: Props) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [search, setSearch] = useState("");
  const [expenseType, setExpenseType] = useState(ALL_EXPENSE_TYPES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("expenseDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const getRowTimingDate = (row: CashExpenseRecord) => row.updatedAt ?? row.expenseDate;

  const expenseTypeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(rows.map((row) => row.expenseType))).sort((a, b) =>
      a.localeCompare(b),
    );
    return [
      { value: ALL_EXPENSE_TYPES, label: "All Types" },
      ...uniqueTypes.map((type) => ({ value: type, label: type })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        const query = search.trim().toLowerCase();
        const rowDateValue = getRowTimingDate(row);
        const rowDate = rowDateValue ? new Date(rowDateValue) : null;
        if (expenseType !== ALL_EXPENSE_TYPES && row.expenseType !== expenseType) return false;
        if (sharedDateFrom && rowDate && rowDate < new Date(`${sharedDateFrom}T00:00:00`)) return false;
        if (sharedDateTo && rowDate && rowDate > new Date(`${sharedDateTo}T23:59:59`)) return false;
        if (!query) return true;
        return [row.expenseType, row.description].some((value) =>
          value.toLowerCase().includes(query),
        );
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "expenseDate") {
          return (new Date(getRowTimingDate(left)).getTime() - new Date(getRowTimingDate(right)).getTime()) * invert;
        }
        if (sortKey === "amount") return (left.amount - right.amount) * invert;
        return String(left[sortKey]).localeCompare(String(right[sortKey])) * invert;
      });
  }, [rows, search, expenseType, sharedDateFrom, sharedDateTo, sortDirection, sortKey]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "amount" ? "desc" : "asc");
  };

   useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);


  useEffect(() => {
    const appliedFilters = [
      search.trim() ? `Search: ${search.trim()}` : "",
      expenseType !== ALL_EXPENSE_TYPES ? `Expense Type: ${expenseType}` : "",
      sharedDateFilter !== "all_time" ? `Range: ${sharedDateFilter}` : "",
      sharedDateFrom ? `Date From: ${sharedDateFrom}` : "",
      sharedDateTo ? `Date To: ${sharedDateTo}` : "",
      `Sort: ${sortKey} (${sortDirection})`,
    ].filter(Boolean);

    onExportDataChange?.({
      title: "Expenses",
      columns: [
        "Expense Date",
        "Expense Type",
        "Description",
        `Amount (${currencySymbol})`,
        "Status",
      ],
      rows: filtered.map((row) => {
        const isRowOpen = row.transactionStatus === "open";
        const createdTime = formatTime(row.createdAt);
        const transactionTime = isRowOpen
          ? formatTime(row.transactionOpenedAt)
          : formatTime(row.transactionClosedAt);

        return [
          createdTime
            ? `${formatDate(row.expenseDate)} (${createdTime})`
            : formatDate(row.expenseDate),
          row.expenseType,
          row.description,
          formatAmount(row.amount ?? 0),
          isRowOpen
            ? `Open (Opened at ${transactionTime || "--"})`
            : `Closed (Closed at ${transactionTime || "--"})`,
        ];
      }),
      appliedFilters,
      totalRecords: filtered.length,
    });
  }, [
    filtered,
    onExportDataChange,
    search,
    expenseType,
    sharedDateFilter,
    sharedDateFrom,
    sharedDateTo,
    sortDirection,
    sortKey,
  ]);

  return (
    <div className="cash-mgmt__tab-panel">
      <div className="cash-mgmt__section-header">
        <div className="cash-mgmt__section-copy">
          <h3 className="cash-mgmt__section-title">Expenses</h3>
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
            placeholder="Search by expense type, description or user"
          />
        </div>
        <div className="cash-mgmt__tab-toolbar-group">
          <CashMgmtFilterSelect
            value={expenseType}
            options={expenseTypeOptions}
            onChange={(value) => {
              setExpenseType(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {actionsDisabled ? (
        <div className="cash-mgmt__inline-note">Processing expense action...</div>
      ) : null}

      <div className="cash-mgmt__table-shell">
        <table className="cash-mgmt__table">
          <thead>
            <tr>
              {[
                ["expenseDate", "Expense Date"],
                ["expenseType", "Expense Type"],
                ["description", "Description"],
                ["amount", "Amount"],
                ["status", "Status"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button
                    type="button"
                    className="cash-mgmt__table-sort"
                    onClick={() => {
                      if (key !== "status") {
                        toggleSort(key as SortKey);
                      }
                    }}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="cash-mgmt__empty-state">
                    <h3 className="cash-mgmt__empty-title">No expenses found</h3>
                    <p className="cash-mgmt__empty-text">
                      Use the add expense action to track cash outflows for the active counter.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {paged.map((row) => {
              const isRowOpen = row.transactionStatus === "open";
              const createdTime = formatTime(row.expenseDate);
              const transactionTime = isRowOpen
                ? formatTime(row.transactionOpenedAt)
                : formatTime(row.transactionClosedAt);

              return (
                <tr key={row.id}>
                  <td>
                    <div className="cash-mgmt__detail-cell">
                      <span>{formatDate(row.expenseDate)}</span>
                      {createdTime ? (
                        <span className="cash-mgmt__detail-time">{createdTime}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{row.expenseType}</td>
                  <td>{row.description}</td>
                  <td>{formatAmount(row.amount)}</td>
                  <td>
                    <div className="cash-mgmt__status-cell">
                      <span
                        className={`cash-mgmt__status-pill ${
                          isRowOpen
                            ? "cash-mgmt__status-pill--open"
                            : "cash-mgmt__status-pill--closed"
                        }`}
                      >
                        {isRowOpen ? "Open" : "Closed"}
                      </span>
                      <span className="cash-mgmt__status-time">
                        {isRowOpen
                          ? `Opened at ${transactionTime || "--"}`
                          : `Closed at ${transactionTime || "--"}`}
                      </span>
                    </div>
                  </td>
                  <td>
                    {isRowOpen ? (
                      <CashMgmtRowActionsMenu
                        onEdit={() => onEdit(row)}
                        onDelete={() => onDelete(row)}
                        disabled={!canManage || actionsDisabled}
                      />
                    ) : (
                      <span className="cash-mgmt__locked-indicator">Locked</span>
                    )}
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
