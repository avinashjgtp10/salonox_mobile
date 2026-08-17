import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PAYROLL_HISTORY_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./PayrollHistoryReport.scss";

const REPORT_NAME = "Payroll History Report";

interface PayrollHistoryRow {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  commission: number;
  tips: number;
  bonus: number;
  salaryAdvance: number;
  deductions: number;
  netPay: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
}

interface FilterOption { id: string; label: string; }

const PAYMENT_STATUS_OPTIONS: FilterOption[] = [
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
];

const PAYMENT_METHOD_OPTIONS: FilterOption[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "net_banking", label: "Net banking" },
  { id: "cheque", label: "Cheque" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

// dd/MM/yyyy, consistently across the table and every export (CSV reads the
// same formatted string).
function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Payroll History API
// (POST /api/report/payroll-history — reads payroll_entries directly, never
// the Appointment API) to the table's row shape.
function mapRow(row: any): PayrollHistoryRow {
  return {
    id: row.id,
    staffId: row.staff_id ? String(row.staff_id) : "",
    staffName: row.staff_name || "—",
    designation: row.staff_designation || "—",
    periodType: row.period_type || "—",
    periodStart: row.period_start ? formatDate(row.period_start) : "—",
    periodEnd: row.period_end ? formatDate(row.period_end) : "—",
    baseSalary: Number(row.base_salary) || 0,
    commission: Number(row.commission) || 0,
    tips: Number(row.tips) || 0,
    bonus: Number(row.bonus) || 0,
    salaryAdvance: Number(row.salary_advance) || 0,
    deductions: Number(row.deductions) || 0,
    netPay: Number(row.net_pay) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    pendingAmount: Number(row.pending_amount) || 0,
    paymentStatus: row.payment_status || "unpaid",
    paymentMethod: row.payment_method || "N/A",
    paymentDate: row.payment_date ? formatDate(row.payment_date) : "—",
  };
}

export default function PayrollHistoryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [rows,        setRows]        = useState<PayrollHistoryRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalEntries: 0, totalNetPayroll: 0, totalPaid: 0, totalPending: 0 });
  // No separate /staff API call — the payroll-history API itself returns
  // filters_available.staff, so options stay complete regardless of the
  // current date/filter selection.
  const [staffOptions, setStaffOptions] = useState<FilterOption[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (paymentStatusFilter.length > 0) body.payment_statuses = paymentStatusFilter;
      if (paymentMethodFilter.length > 0) body.payment_methods = paymentMethodFilter;
      const res = await api.post(PAYROLL_HISTORY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalEntries: Number(s.total_entries) || 0,
        totalNetPayroll: Number(s.total_net_payroll) || 0,
        totalPaid: Number(s.total_paid) || 0,
        totalPending: Number(s.total_pending) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalEntries: 0, totalNetPayroll: 0, totalPaid: 0, totalPending: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, staffFilterIds, paymentStatusFilter, paymentMethodFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, staffFilterIds, paymentStatusFilter, paymentMethodFilter]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "payment_status", label: "Payment Status", options: PAYMENT_STATUS_OPTIONS },
    { key: "payment_method", label: "Payment Method", options: PAYMENT_METHOD_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    payment_status: paymentStatusFilter,
    payment_method: paymentMethodFilter,
  }), [staffFilterIds, paymentStatusFilter, paymentMethodFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setPaymentStatusFilter(next.payment_status ?? []);
    setPaymentMethodFilter(next.payment_method ?? []);
  };

  const HEADERS = ["Staff", "Designation", "Period Start", "Period End", `Base Salary (${currencySymbol})`, `Commission (${currencySymbol})`, `Tips (${currencySymbol})`, `Bonus (${currencySymbol})`, `Salary Advance (${currencySymbol})`, `Deductions (${currencySymbol})`, `Net Pay (${currencySymbol})`, `Paid (${currencySymbol})`, `Pending (${currencySymbol})`, "Payment Method", "Payment Date", "Status"];
  const exportRows = () => rows.map(r => [r.staffName, r.designation, r.periodStart, r.periodEnd, r.baseSalary, r.commission, r.tips, r.bonus, r.salaryAdvance, r.deductions, r.netPay, r.paidAmount, r.pendingAmount, r.paymentMethod, r.paymentDate, PAYMENT_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`payroll-history-${dateFrom}-${dateTo}`} variant="button" csv />
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

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEntries}</div><div className="rp-sra-summary-label">Payroll Entries</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalNetPayroll)}</div><div className="rp-sra-summary-label">Total Net Payroll</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalPaid)}</div><div className="rp-sra-summary-label">Total Paid</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalPending)}</div><div className="rp-sra-summary-label">Total Pending</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff name" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Staff</th><th>Designation</th><th>Period Start</th><th>Period End</th>
              <th>Base Salary ({currencySymbol})</th><th>Commission ({currencySymbol})</th><th>Tips ({currencySymbol})</th>
              <th>Bonus ({currencySymbol})</th><th>Salary Advance ({currencySymbol})</th><th>Deductions ({currencySymbol})</th>
              <th>Net Pay ({currencySymbol})</th><th>Paid ({currencySymbol})</th><th>Pending ({currencySymbol})</th>
              <th>Payment Method</th><th>Payment Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={16} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={16} className="rp-detail-empty-cell">No payroll history found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.designation}</td>
                <td>{r.periodStart}</td>
                <td>{r.periodEnd}</td>
                <td>{formatAmount(r.baseSalary)}</td>
                <td>{formatAmount(r.commission)}</td>
                <td>{formatAmount(r.tips)}</td>
                <td>{formatAmount(r.bonus)}</td>
                <td>{formatAmount(r.salaryAdvance)}</td>
                <td>{formatAmount(r.deductions)}</td>
                <td className="fw-semibold">{formatAmount(r.netPay)}</td>
                <td>{formatAmount(r.paidAmount)}</td>
                <td>{formatAmount(r.pendingAmount)}</td>
                <td>{r.paymentMethod}</td>
                <td>{r.paymentDate}</td>
                <td><span className={`rp-status-badge rp-status-${r.paymentStatus}`}>{PAYMENT_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus}</span></td>
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
