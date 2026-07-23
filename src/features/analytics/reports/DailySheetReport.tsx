import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { DAILY_SHEET_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import "./DailySheetReport.scss";

const REPORT_NAME = "Daily Sheet";

interface DailyRow {
  appointmentId: string | null;
  serviceId: string | null;
  staffId: string | null;
  time: string;
  ticketNo: string;
  clientName: string;
  service: string;
  staff: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

// Maps a row from the independent Daily Sheet API
// (POST /api/report/daily-sheet — reads sales/sale_items directly, never
// the Appointment API) to the table's existing DailyRow shape.
function mapRow(row: any): DailyRow {
  return {
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    serviceId: row.service_id ? String(row.service_id) : null,
    staffId: row.staff_id ? String(row.staff_id) : null,
    time: row.time || "—",
    ticketNo: row.ticket_no ?? "—",
    clientName: row.client_name || "Walk-in",
    service: row.service || "—",
    staff: row.staff || "—",
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method || "N/A",
    status: row.status ?? "booked",
  };
}

interface FilterOption { id: string; label: string; }

export default function DailySheetReport({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [serviceFilter,   setServiceFilter]   = useState<string>("All");
  const [staffFilter,     setStaffFilter]     = useState<string>("All");
  // No separate /services or /staff calls — the daily-sheet API itself
  // returns filters_available (every service/staff that has ever appeared
  // in this salon's sales), so options are always complete regardless of
  // the current date/filter selection.
  const [serviceOptions,  setServiceOptions]  = useState<FilterOption[]>([]);
  const [staffOptions,    setStaffOptions]    = useState<FilterOption[]>([]);
  const [showSvcDrop,     setShowSvcDrop]     = useState(false);
  const [showStfDrop,     setShowStfDrop]     = useState(false);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
  const [total,           setTotal]            = useState(0);
  const [totalRevenue,    setTotalRevenue]     = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with the total amount computed
  // by the backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { date, page: currentPage, limit: pageSize };
      if (serviceFilter !== "All") body.service_id = serviceFilter;
      if (staffFilter   !== "All") body.staff_id = staffFilter;
      const res = await api.post(DAILY_SHEET_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setTotalRevenue(Number(data?.total_amount) || 0);
      setServiceOptions(Array.isArray(data?.filters_available?.services) ? data.filters_available.services : []);
      setStaffOptions(Array.isArray(data?.filters_available?.staff) ? data.filters_available.staff : []);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0); setTotalRevenue(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [date, serviceFilter, staffFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter changes go back to page 1 — page/pageSize changes themselves
  // should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [date, serviceFilter, staffFilter]);

  useEffect(() => {
    const close = () => { setShowSvcDrop(false); setShowStfDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Time", "Ticket No", "Client Name", "Service", "Staff", "Amount (₹)", "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [r.time, r.ticketNo, r.clientName, r.service, r.staff, r.amount, r.paymentMethod, r.status]);

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
            {serviceFilter === "All" ? "All" : (serviceOptions.find(o => o.id === serviceFilter)?.label ?? "All")} <span className="rp-detail-caret">▼</span>
          </button>
          {showSvcDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              <div className={`rp-detail-dropdown-item ${serviceFilter === "All" ? "active" : ""}`}
                onClick={() => { setServiceFilter("All"); setShowSvcDrop(false); }}>All</div>
              {serviceOptions.map(o => (
                <div key={o.id} className={`rp-detail-dropdown-item ${o.id === serviceFilter ? "active" : ""}`}
                  onClick={() => { setServiceFilter(o.id); setShowSvcDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => { setShowStfDrop(v => !v); setShowSvcDrop(false); }}>
            {staffFilter === "All" ? "All" : (staffOptions.find(o => o.id === staffFilter)?.label ?? "All")} <span className="rp-detail-caret">▼</span>
          </button>
          {showStfDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              <div className={`rp-detail-dropdown-item ${staffFilter === "All" ? "active" : ""}`}
                onClick={() => { setStaffFilter("All"); setShowStfDrop(false); }}>All</div>
              {staffOptions.map(o => (
                <div key={o.id} className={`rp-detail-dropdown-item ${o.id === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.id); setShowStfDrop(false); }}>{o.label}</div>
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
          &nbsp;· {total} transactions
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.appointmentId ? "rp-appt-row" : undefined}
                onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}
              >
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
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedAppointmentId && (
        <AppointmentDetailModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </div>
  );
}
