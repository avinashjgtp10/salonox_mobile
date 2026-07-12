import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./RewardReport.scss";

const REPORT_NAME = "Reward";

interface RewardRow {
  date: string;
  invoiceNo: string;
  client: string;
  value: number;
}

export default function RewardReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [rows,        setRows]        = useState<RewardRow[]>([]);
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
      // The backend only tracks reward points *redeemed as payment* (a value in ₹, on the
      // appointment's linked payments) — there's no "points earned" or points-count field
      // to report on yet, so this shows redemptions only.
      const res = await api.get(BOOKING.BASE, { params: { start_date: dateFrom, end_date: dateTo, limit: "200" }, signal: ctrl.signal });
      const raw = res.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];
      const result: RewardRow[] = [];
      appts.forEach((appt: any) => {
        const value = Number(appt.reward_points_value) || 0;
        if (value <= 0) return;
        result.push({
          date: String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10),
          invoiceNo: appt.invoice_number != null ? String(appt.invoice_number) : String(appt.id ?? "—"),
          client: appt.client_name ?? "Walk-in",
          value,
        });
      });
      result.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  const HEADERS = ["Date", "Invoice No", "Client", "Redeemed Value (₹)"];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.value]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`reward-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={2} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Redemptions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalValue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Redeemed Value</div></div>
        </div>
      )}

      <div className="rp-detail-drag-hint">Reward points redeemed as payment — points earned aren't tracked by the backend yet.</div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Invoice No</th><th>Client</th><th>Redeemed Value (₹)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={4} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={4} className="rp-detail-empty-cell">No reward redemptions found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.client}</td>
                <td className="fw-semibold">₹{r.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
