import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./TipReport.scss";

const REPORT_NAME = "Tip Report";

const STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Unpaid" },
  { id: "partial", label: "Partial" },
];

interface EarnedRow {
  staffId: string;
  staffName: string;
  transactions: number;
  earned: number;
  pending: number;
  paid: number;
}

interface Summary {
  totalTips: number;
  pendingTips: number;
  paidTips: number;
  transactionCount: number;
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Same post-aggregation status convention as Commission Report — status
// isn't a per-row concept on the backend (tip_earned rows are individually
// pending/paid), a staff member counts as Partial when their filtered range
// has both pending and paid tips.
function statusOf(r: EarnedRow): "Partial" | "Unpaid" | "Paid" | "—" {
  return r.pending > 0 && r.paid > 0 ? "Partial" : r.pending > 0 ? "Unpaid" : r.paid > 0 ? "Paid" : "—";
}

export default function TipReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [search,      setSearch]      = useState("");
  const [rows,        setRows]        = useState<EarnedRow[]>([]);
  const [summary,     setSummary]     = useState<Summary>({ totalTips: 0, pendingTips: 0, paidTips: 0, transactionCount: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params: Record<string, any> = { start_date: dateFrom, end_date: dateTo };
      if (staffFilterIds.length > 0) params.staff_ids = staffFilterIds.join(",");
      // Backend only accepts a single status value — only send one when
      // exactly one checkbox is selected; 0 or 2+ selected means "All".
      if (statusFilter.length === 1) params.status = statusFilter[0];
      const [earnedRes, summaryRes] = await Promise.all([
        api.get(STAFF.TIP_EARNED, { params, signal: ctrl.signal }),
        api.get(STAFF.TIP_SUMMARY, { params: { start_date: dateFrom, end_date: dateTo, ...(staffFilterIds.length > 0 ? { staff_ids: staffFilterIds.join(",") } : {}) }, signal: ctrl.signal }),
      ]);
      const earned: any[] = Array.isArray(earnedRes.data?.data) ? earnedRes.data.data : [];
      setRows(earned.map((r: any) => ({
        staffId: String(r.staff_id ?? ""),
        staffName: `${r.staff_first_name ?? ""} ${r.staff_last_name ?? ""}`.trim() || "—",
        transactions: Number(r.transaction_count) || 0,
        earned: Number(r.total_tips) || 0,
        pending: Number(r.pending_payout) || 0,
        paid: Number(r.paid_out) || 0,
      })));
      const s = summaryRes.data?.data ?? {};
      setSummary({
        totalTips: Number(s.total_tips) || 0,
        pendingTips: Number(s.pending_payout) || 0,
        paidTips: Number(s.paid_out) || 0,
        transactionCount: Number(s.count) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setRows([]); setSummary({ totalTips: 0, pendingTips: 0, paidTips: 0, transactionCount: 0 }); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, statusFilter, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.staffName.toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => { setCurrentPage(1); }, [filteredRows.length]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff Member", options: staffOptions, searchable: true },
    { key: "status", label: "Tip Status", options: STATUS_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    status: statusFilter,
  }), [staffFilterIds, statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setStatusFilter(next.status ?? []);
  };

  const HEADERS = ["Staff", "Transactions", `Tips Earned (${currencySymbol})`, `Pending (${currencySymbol})`, `Paid (${currencySymbol})`, "Status"];
  const exportRows = () => filteredRows.map(r => [r.staffName, r.transactions, r.earned, r.pending, r.paid, statusOf(r)]);
  const paged = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              reportId="tip_report"
              filename={`tip-report-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={[
                ...(staffFilterIds.length > 0
                  ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(statusFilter.length > 0
                  ? [`Status: ${statusFilter.map(v => STATUS_OPTIONS.find(o => o.id === v)?.label ?? v).join(", ")}`]
                  : []),
              ]}
              summaryLines={[
                `Total Tips: ${formatAmount(summary.totalTips)}`,
                `Pending Tips: ${formatAmount(summary.pendingTips)}`,
                `Paid Tips: ${formatAmount(summary.paidTips)}`,
                `Transactions: ${summary.transactionCount}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.totalTips)}</div><div className="rp-sra-summary-label">Total Tips</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.pendingTips)}</div><div className="rp-sra-summary-label">Pending Tips</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.paidTips)}</div><div className="rp-sra-summary-label">Paid Tips</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{summary.transactionCount}</div><div className="rp-sra-summary-label">Transactions</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff name" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Staff</th><th>Transactions</th><th>Tips Earned ({currencySymbol})</th><th>Pending ({currencySymbol})</th><th>Paid ({currencySymbol})</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No tip data found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.staffId}>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.transactions}</td>
                <td className="fw-semibold">{formatAmount(r.earned)}</td>
                <td>{formatAmount(r.pending)}</td>
                <td>{formatAmount(r.paid)}</td>
                <td><span className={`rp-status-badge rp-status-${statusOf(r).toLowerCase()}`}>{statusOf(r)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={filteredRows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
