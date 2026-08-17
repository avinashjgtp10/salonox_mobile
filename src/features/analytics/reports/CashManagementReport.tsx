import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CASH_MANAGEMENT_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";

const REPORT_NAME = "Cash Management Report";

interface CashManagementRow {
  id: string;
  status: "open" | "closed";
  openingBalance: number;
  cashRevenue: number;
  cashExpense: number;
  closingBalance: number;
  inStoreCash: number | null;
  reconciliationAmount: number | null;
  remarks: string | null;
  openedAt: string | null;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
}

function mapRow(row: any): CashManagementRow {
  return {
    id: String(row.id),
    status: row.status === "open" ? "open" : "closed",
    openingBalance: Number(row.opening_balance) || 0,
    cashRevenue: Number(row.cash_revenue) || 0,
    cashExpense: Number(row.cash_expense) || 0,
    closingBalance: Number(row.closing_balance) || 0,
    inStoreCash: row.in_store_cash === null ? null : Number(row.in_store_cash),
    reconciliationAmount: row.reconciliation_amount === null ? null : Number(row.reconciliation_amount),
    remarks: row.remarks || null,
    openedAt: row.opened_at || null,
    closedAt: row.closed_at || null,
    openedBy: row.opened_by || "System",
    closedBy: row.closed_by || null,
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function CashManagementReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [statusOptions, setStatusOptions] = useState<{ id: string; label: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,    setRows]    = useState<CashManagementRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState({
    totalOpeningBalance: 0, totalCashRevenue: 0, totalCashExpense: 0,
    totalClosingBalance: 0, totalReconciliationAmount: 0,
    totalSessions: 0, openSessions: 0, closedSessions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (statusFilter.length > 0) body.statuses = statusFilter;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(CASH_MANAGEMENT_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.status)) {
        setStatusOptions(avail.status.map((o: any) => ({ id: String(o.id), label: o.label })));
      }
      const s = data?.stats ?? {};
      setStats({
        totalOpeningBalance: Number(s.total_opening_balance) || 0,
        totalCashRevenue: Number(s.total_cash_revenue) || 0,
        totalCashExpense: Number(s.total_cash_expense) || 0,
        totalClosingBalance: Number(s.total_closing_balance) || 0,
        totalReconciliationAmount: Number(s.total_reconciliation_amount) || 0,
        totalSessions: Number(s.total_sessions) || 0,
        openSessions: Number(s.open_sessions) || 0,
        closedSessions: Number(s.closed_sessions) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({
          totalOpeningBalance: 0, totalCashRevenue: 0, totalCashExpense: 0,
          totalClosingBalance: 0, totalReconciliationAmount: 0,
          totalSessions: 0, openSessions: 0, closedSessions: 0,
        });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, statusFilter, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: statusOptions },
  ], [statusOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter,
  }), [statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
  };

  const HEADERS = [
    "Date", "Opened By", "Closed By", "Opening Balance", "Cash Revenue",
    "Cash Expense", "In-Store Cash", "Closing Balance", "Reconciliation", "Status", "Remarks",
  ];
  const exportRows = () => rows.map(r => [
    formatDate(r.openedAt), r.openedBy, r.closedBy || "—",
    r.openingBalance, r.cashRevenue, r.cashExpense, r.inStoreCash ?? "—",
    r.closingBalance, r.reconciliationAmount ?? "—",
    r.status === "open" ? "Open" : "Closed", r.remarks || "—",
  ]);

  const activeFilterLines = [
    ...(statusFilter.length
      ? [`Status: ${statusOptions.filter(o => statusFilter.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
  ];

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              filename={`cash-management-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Cash Revenue: ${formatAmount(stats.totalCashRevenue)}`,
                `Cash Expense: ${formatAmount(stats.totalCashExpense)}`,
                `Closing Balance: ${formatAmount(stats.totalClosingBalance)}`,
                `Reconciliation: ${formatAmount(stats.totalReconciliationAmount)}`,
                `Sessions: ${stats.totalSessions} (${stats.openSessions} Open / ${stats.closedSessions} Closed)`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalCashRevenue)}</div><div className="rp-sra-summary-label">Cash Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalCashExpense)}</div><div className="rp-sra-summary-label">Cash Expense</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalClosingBalance)}</div><div className="rp-sra-summary-label">Closing Balance</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalReconciliationAmount)}</div><div className="rp-sra-summary-label">Reconciliation</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.openSessions} / {stats.closedSessions}</div><div className="rp-sra-summary-label">Open / Closed Sessions</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Opened by, closed by or remarks" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Opened By</th><th>Closed By</th>
              <th>Opening Balance</th><th>Cash Revenue</th><th>Cash Expense</th>
              <th>In-Store Cash</th><th>Closing Balance</th><th>Reconciliation</th>
              <th>Status</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={11} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No cash counter sessions found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.openedAt)}</td>
                <td className="fw-semibold">{r.openedBy}</td>
                <td>{r.closedBy || "—"}</td>
                <td>{formatAmount(r.openingBalance)}</td>
                <td>{formatAmount(r.cashRevenue)}</td>
                <td>{formatAmount(r.cashExpense)}</td>
                <td>{r.inStoreCash === null ? "—" : formatAmount(r.inStoreCash)}</td>
                <td className="fw-semibold">{formatAmount(r.closingBalance)}</td>
                <td>{r.reconciliationAmount === null ? "—" : formatAmount(r.reconciliationAmount)}</td>
                <td>
                  <span className={`rp-status-badge ${r.status === "open" ? "rp-status-partial" : "rp-status-paid"}`}>
                    {r.status === "open" ? "Open" : "Closed"}
                  </span>
                </td>
                <td>{r.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
