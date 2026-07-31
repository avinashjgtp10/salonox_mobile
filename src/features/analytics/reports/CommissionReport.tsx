import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, DateRangePicker } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./CommissionReport.scss";

const REPORT_NAME = "Commission Report";

interface EarnedRow {
  staffId: string;
  staffName: string;
  designation: string;
  categories: string[];
  transactions: number;
  revenue: number;
  earned: number;
  pending: number;
  paid: number;
}

interface Summary {
  totalCommission: number;
  totalRevenue: number;
  pendingPayout: number;
  paidOut: number;
}

export default function CommissionReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today       = new Date().toISOString().slice(0, 10);
  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearch]      = useState("");
  const [rows,        setRows]        = useState<EarnedRow[]>([]);
  const [summary,     setSummary]     = useState<Summary>({ totalCommission: 0, totalRevenue: 0, pendingPayout: 0, paidOut: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = { start_date: dateFrom, end_date: dateTo };
      const [earnedRes, summaryRes] = await Promise.all([
        api.get(`${STAFF.BASE}/commissions/earned`, { params, signal: ctrl.signal }),
        api.get(`${STAFF.BASE}/commissions/summary`, { params, signal: ctrl.signal }),
      ]);
      const earned: any[] = Array.isArray(earnedRes.data?.data) ? earnedRes.data.data : [];
      setRows(earned.map((r: any) => ({
        staffId: String(r.staff_id ?? ""),
        staffName: `${r.staff_first_name ?? ""} ${r.staff_last_name ?? ""}`.trim() || "—",
        designation: r.staff_designation ?? "—",
        categories: Array.isArray(r.categories) ? r.categories : [],
        transactions: Number(r.transaction_count) || 0,
        revenue: Number(r.total_revenue) || 0,
        earned: Number(r.total_earned) || 0,
        pending: Number(r.pending_payout) || 0,
        paid: Number(r.paid_out) || 0,
      })));
      const s = summaryRes.data?.data ?? {};
      setSummary({
        totalCommission: Number(s.total_commission) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        pendingPayout: Number(s.pending_payout) || 0,
        paidOut: Number(s.paid_out) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setRows([]); setSummary({ totalCommission: 0, totalRevenue: 0, pendingPayout: 0, paidOut: 0 }); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.staffName.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => { setCurrentPage(1); }, [filteredRows.length]);

  const HEADERS = ["Staff", "Designation", "Categories", "Transactions", `Revenue (${currencySymbol})`, `Commission Earned (${currencySymbol})`, `Pending (${currencySymbol})`, `Paid (${currencySymbol})`, "Status"];
  const statusOf = (r: EarnedRow) => r.pending > 0 ? "Pending" : r.paid > 0 ? "Paid" : "—";
  const exportRows = () => filteredRows.map(r => [r.staffName, r.designation, r.categories.join(", "), r.transactions, r.revenue, r.earned, r.pending, r.paid, statusOf(r)]);
  const paged = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`commission-report-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(s, e) => { setDateFrom(s); setDateTo(e); }} />
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.totalCommission)}</div><div className="rp-sra-summary-label">Total Commission</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.pendingPayout)}</div><div className="rp-sra-summary-label">Pending Payout</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.paidOut)}</div><div className="rp-sra-summary-label">Paid Out</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff or designation" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Staff</th><th>Designation</th><th>Categories</th><th>Transactions</th><th>Revenue ({currencySymbol})</th><th>Commission Earned ({currencySymbol})</th><th>Pending ({currencySymbol})</th><th>Paid ({currencySymbol})</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No commission data found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.staffId}>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.designation}</td>
                <td>{r.categories.length ? r.categories.join(", ") : "—"}</td>
                <td>{r.transactions}</td>
                <td>{formatAmount(r.revenue)}</td>
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
