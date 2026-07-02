import { useEffect, useMemo, useState } from "react";
import { Search, SortDown, SortUp } from "react-bootstrap-icons";
import { Pagination } from "../../../components/ui";
import type { CashManagementExportDataset } from "../cashManagement.export";
import type { CashRevenueRecord } from "../cashManagement.types";

interface Props {
  rows: CashRevenueRecord[];
  loading?: boolean;
  sharedDateFilter: "today" | "yesterday" | "week" | "month" | "all" | "custom";
  sharedDateFrom: string;
  sharedDateTo: string;
  onFilteredCountChange?: (count: number) => void;
  onExportDataChange?: (dataset: CashManagementExportDataset) => void;
}

type SortKey =
  | "updatedAt"
  | "invoiceId"
  | "client"
  | "staff"
  | "service"
  | "paymentMethod"
  | "cashReceived";

const formatPdfCurrency = (value: number | null | undefined) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

const parseUtcDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T").replace(/\+00$/, "Z");
  const next = new Date(normalized);
  return Number.isNaN(next.getTime()) ? null : next;
};

const formatDate = (value?: string | null) => {
  const next = parseUtcDate(value);
  if (!next) return "--";
  return next.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

const formatDateTime = (value?: string | null) => {
  const next = parseUtcDate(value);
  if (!next) return "--";
  return next.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const matchesQuery = (row: CashRevenueRecord, query: string) => {
  if (!query) return true;

  return [
    row.invoiceId,
    row.paymentId,
    row.client,
    row.staff,
    row.service,
    row.paymentMethod,
    String(row.cashReceived),
   
  ].some((value) => value.toLowerCase().includes(query));
};

export default function CashManagementRevenueTab({
  rows,
  loading = false,
  sharedDateFilter,
  sharedDateFrom,
  sharedDateTo,
  onFilteredCountChange,
  onExportDataChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        const query = search.trim().toLowerCase();
        const rowDate = row.updatedAt ? new Date(row.updatedAt) : null;
        if (sharedDateFrom && rowDate && rowDate < new Date(`${sharedDateFrom}T00:00:00`)) {
          return false;
        }
        if (sharedDateTo && rowDate && rowDate > new Date(`${sharedDateTo}T23:59:59`)) {
          return false;
        }
        return matchesQuery(row, query);
      })
      .sort((left, right) => {
        const invert = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "updatedAt") {
          return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * invert;
        }
   
        return String(left[sortKey]).localeCompare(String(right[sortKey])) * invert;
      });
  }, [rows, search, sharedDateFrom, sharedDateTo, sortDirection, sortKey]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalCashRevenue = filtered.reduce((sum, row) => sum + row.cashReceived, 0);

  useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);

  useEffect(() => {
    const appliedFilters = [
      search.trim() ? `Search: ${search.trim()}` : "",
      sharedDateFilter !== "all" ? `Range: ${sharedDateFilter}` : "",
      sharedDateFrom ? `Date From: ${sharedDateFrom}` : "",
      sharedDateTo ? `Date To: ${sharedDateTo}` : "",
      `Sort: ${sortKey} (${sortDirection})`,
    ].filter(Boolean);

    onExportDataChange?.({
      title: "Revenue",
      columns: [
        "Updated Date",
        "Invoice ID",
        "Client",
        "Staff",
        "Service",
        "Payment Method",
        "Cash Received (Rs.)",
       
      ],
      rows: filtered.map((row) => [
        formatDateTime(row.updatedAt),
        row.invoiceId,
        row.client,
        row.staff,
        row.service,
        row.paymentMethod,
        formatPdfCurrency(row.cashReceived),
     
      ]),
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
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(
      key === "updatedAt" || key === "cashReceived"  ? "desc" : "asc",
    );
  };

  return (
    <div className="cash-mgmt__tab-panel">
      <div className="cash-mgmt__section-header">
        <div className="cash-mgmt__section-copy">
          <h3 className="cash-mgmt__section-title">Revenue</h3>
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
            placeholder="Search by payment, client, staff, service or method"
          />
        </div>
      </div>

      <div className="cash-mgmt__tab-metric">
        <span className="cash-mgmt__metric-label">Total Cash Revenue</span>
        <strong className="cash-mgmt__metric-value">{formatPdfCurrency(totalCashRevenue)}</strong>
      </div>

      <div className="cash-mgmt__table-meta">
        <span className="cash-mgmt__table-stat">Row Count: {filtered.length}</span>
        <span className="cash-mgmt__table-stat">
          Showing: {paged.length} / {filtered.length}
        </span>
      </div>

      <div className="cash-mgmt__table-shell">
        <table className="cash-mgmt__table">
          <thead>
            <tr>
              {[
                ["updatedAt", "Updated Date"],
                ["invoiceId", "Invoice ID"],
                ["client", "Client"],
                ["staff", "Staff"],
                ["service", "Service"],
                ["paymentMethod", "Payment Method"],
                ["cashReceived", "Cash Received"],
              
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
            {!loading && paged.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="cash-mgmt__empty-state">
                    <h3 className="cash-mgmt__empty-title">No revenue found</h3>
                    <p className="cash-mgmt__empty-text">
                      Cash revenue will appear here once payments are updated for the selected branch.
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}

            {paged.map((row) => {
              const updatedTime = formatTime(row.updatedAt);

              return (
                <tr key={row.id}>
                  <td>
                    <div className="cash-mgmt__detail-cell">
                      <span>{formatDate(row.updatedAt)}</span>
                      {updatedTime ? (
                        <span className="cash-mgmt__detail-time">{updatedTime}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{row.invoiceId}</td>
                  <td>{row.client}</td>
                  <td>{row.staff}</td>
                  <td>{row.service}</td>
                  <td>{row.paymentMethod}</td>
                  <td>{formatCurrency(row.cashReceived)}</td>
              
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
