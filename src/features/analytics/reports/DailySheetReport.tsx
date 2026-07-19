import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft, Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REPORT, SERVICES } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./DailySheetReport.scss";

const REPORT_NAME = "Daily Sheet";

interface DailyRow {
  time: string;
  ticketNo: string;
  clientName: string;
  service: string;
  staff: string;
  amount: number;
  paymentMethod: string;
}

export default function DailySheetReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [serviceFilter,   setServiceFilter]   = useState("All");
  const [serviceOptions,  setServiceOptions]  = useState<string[]>(["All"]);
  const [staffFilter,     setStaffFilter]     = useState("All");
  const [staffNames,      setStaffNames]      = useState<string[]>([]);
  const [showSvcDrop,     setShowSvcDrop]     = useState(false);
  const [showStfDrop,     setShowStfDrop]     = useState(false);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.get(SERVICES.BASE).then(res => {
      const list: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const names = list.map((s: any) => s.name as string).filter(Boolean);
      setServiceOptions(["All", ...names]);
    }).catch(() => {});

    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const names = list.map((s: any) => [s.first_name, s.last_name].filter(Boolean).join(" ")).filter(Boolean);
      setStaffNames(names);
    }).catch(() => {});
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (serviceFilter !== "All") params.set("service", serviceFilter);
      if (staffFilter   !== "All") params.set("staff", staffFilter);
      const res = await api.get(REPORT.DAILY_SHEET_TABLE(params.toString()), { signal: ctrl.signal });
      const raw: any[] = res.data?.data ?? [];
      const mapped: DailyRow[] = raw.map((r: any) => ({
        time: r.time || "—",
        ticketNo: r.ticketNo,
        clientName: r.clientName || "Walk-in",
        service: r.service || "—",
        staff: r.staff || "—",
        amount: Number(r.amount) || 0,
        paymentMethod: r.paymentMethod || "N/A",
      }));
      setRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [date, serviceFilter, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowSvcDrop(false); setShowStfDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const totalRevenue = rows.reduce((sum, r) => sum + r.amount, 0);
  const HEADERS = ["Time", "Ticket No", "Client Name", "Service", "Staff", "Amount (₹)", "Payment Method"];
  const exportRows = () => rows.map(r => [r.time, r.ticketNo, r.clientName, r.service, r.staff, r.amount, r.paymentMethod]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`${REPORT_NAME}-${date}`} csv />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rp-detail-date-input rp-detail-date-input--boxed" />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Service</label>
          <button className="rp-detail-select" onClick={() => { setShowSvcDrop(v => !v); setShowStfDrop(false); }}>
            {serviceFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showSvcDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {serviceOptions.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === serviceFilter ? "active" : ""}`}
                  onClick={() => { setServiceFilter(s); setShowSvcDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => { setShowStfDrop(v => !v); setShowSvcDrop(false); }}>
            {staffFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showStfDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {["All", ...staffNames].map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(s); setShowStfDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="rp-detail-drag-hint">
          Daily Total: <strong style={{ color: "#111827", marginLeft: 6 }}>₹{totalRevenue.toLocaleString()}</strong>
          &nbsp;· {rows.length} transactions
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Ticket No</th>
              <th>Client Name</th>
              <th>Service</th>
              <th>Staff</th>
              <th>Amount (₹)</th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td>{r.time || "—"}</td>
                <td>
                  <span className="rp-detail-link" title={r.ticketNo}>
                    {r.ticketNo.length > 12 ? r.ticketNo.slice(0, 8).toUpperCase() + "…" : r.ticketNo}
                  </span>
                </td>
                <td><span className="rp-detail-link">{r.clientName || "Walk-in"}</span></td>
                <td>{r.service}</td>
                <td>{r.staff}</td>
                <td className="fw-semibold">₹{r.amount.toLocaleString("en-IN")}</td>
                <td className="rp-ds-payment">{r.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
}
