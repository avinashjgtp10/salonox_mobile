import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./AppointmentDetailReport.scss";

const REPORT_NAME = "Detailed Appointment Reports";

interface AppointmentRow {
  id: string;
  appointmentDate: string;
  time: string;
  bookedDate: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  status: string;
  duration: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
}

const DATE_TYPE_OPTIONS = ["Appointment Date", "Booking Date"];
const APPT_STATUSES     = ["All", "booked", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const fmtStatusLabel = (s: string) =>
  s === "All" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function AppointmentDetailReport({ onBack }: { onBack: () => void }) {
  const today     = new Date().toISOString().slice(0, 10);
  const monthAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const [dateType,          setDateType]          = useState(DATE_TYPE_OPTIONS[0]);
  const [showDtDrop,        setShowDtDrop]        = useState(false);
  const [dateFrom,          setDateFrom]          = useState(monthAgo);
  const [dateTo,            setDateTo]            = useState(today);
  const [selectedStatuses,  setSelectedStatuses]  = useState<string[]>(APPT_STATUSES);
  const [statusSearch,      setStatusSearch]      = useState("");
  const [showStatusDrop,    setShowStatusDrop]    = useState(false);
  const [rows,              setRows]              = useState<AppointmentRow[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedRow,       setSelectedRow]       = useState<AppointmentRow | null>(null);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateType: dateType === "Appointment Date" ? "appointment" : "booking",
        from: dateFrom,
        to: dateTo,
        statuses: selectedStatuses.filter(s => s !== "All").join(","),
      });
      const res = await api.get<{ data: AppointmentRow[] }>(
        REPORT.DETAIL("appointments", params.toString()),
        { signal: ctrl.signal },
      );
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateType, dateFrom, dateTo, selectedStatuses]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => {
      setShowDtDrop(false);
      setShowStatusDrop(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Appointment Date", "Time", "Booked Date", "Client Name", "Service Name", "Staff Name", "Status", "Duration (min)", "Amount (₹)", "Payment Method", "Payment Status"];
  const exportRows = () => rows.map(r => [r.appointmentDate, r.time, r.bookedDate, r.clientName, r.serviceName, r.staffName, r.status, r.duration, r.amount, r.paymentMethod, r.paymentStatus]);

  const toggleStatus = (s: string) => {
    if (s === "All") {
      setSelectedStatuses(selectedStatuses.length === APPT_STATUSES.length ? [] : [...APPT_STATUSES]);
    } else {
      setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    }
  };

  const statusLabel = selectedStatuses.length === APPT_STATUSES.length
    ? `All selected (${APPT_STATUSES.length - 1})`
    : selectedStatuses.length === 0 ? "None selected"
    : `${selectedStatuses.filter(s => s !== "All").length} selected`;

  const filteredStatuses = APPT_STATUSES.filter(s =>
    fmtStatusLabel(s).toLowerCase().includes(statusSearch.toLowerCase())
  );

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`${REPORT_NAME}-${dateFrom}-${dateTo}`} csv print />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Type</label>
          <button className="rp-detail-select" onClick={() => { setShowDtDrop(v => !v); setShowStatusDrop(false); }}>
            {dateType.length > 14 ? dateType.slice(0, 14) + "..." : dateType}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showDtDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {DATE_TYPE_OPTIONS.map(opt => (
                <div key={opt} className={`rp-detail-dropdown-item ${opt === dateType ? "active" : ""}`}
                  onClick={() => { setDateType(opt); setShowDtDrop(false); }}>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>

        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Appointment Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStatusDrop(v => !v); setShowDtDrop(false); }}>
            {statusLabel} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatusDrop && (
            <div className="rp-detail-dropdown rp-detail-dropdown-wide" onMouseDown={e => e.stopPropagation()}>
              <div className="rp-status-search-wrap">
                <Search size={12} className="rp-status-search-ic" />
                <input
                  type="text"
                  className="rp-status-search-input"
                  placeholder="Search"
                  value={statusSearch}
                  onChange={e => setStatusSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
                {statusSearch && (
                  <button className="rp-status-search-clear" onClick={() => setStatusSearch("")}>✕</button>
                )}
              </div>
              {filteredStatuses.map(opt => (
                <div key={opt} className="rp-detail-checkbox-item" onClick={() => toggleStatus(opt)}>
                  <span className={`rp-detail-checkbox ${selectedStatuses.includes(opt) ? "checked" : ""}`}>
                    {selectedStatuses.includes(opt) && "✓"}
                  </span>
                  {fmtStatusLabel(opt)}
                </div>
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

      <div className="rp-detail-drag-hint">
        {rows.length} appointment{rows.length !== 1 ? "s" : ""} found
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Appointment Date</th>
              <th>Time</th>
              <th>Booked Date</th>
              <th>Client Name</th>
              <th>Service Name</th>
              <th>Staff Name</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No data available</td></tr>
            ) : (
              rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, i) => (
                <tr
                  key={i}
                  className={`rp-appt-row${selectedRow?.id === row.id ? " rp-appt-row--selected" : ""}`}
                  onClick={() => setSelectedRow(prev => prev?.id === row.id ? null : row)}
                >
                  <td>{row.appointmentDate}</td>
                  <td>{row.time}</td>
                  <td>{row.bookedDate}</td>
                  <td>{row.clientName || "—"}</td>
                  <td>{row.serviceName}</td>
                  <td>{row.staffName || "—"}</td>
                  <td><span className={`rp-status-badge rp-status-${row.status}`}>{row.status}</span></td>
                  <td>{row.duration ? `${row.duration} min` : "—"}</td>
                  <td>{row.amount > 0 ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "—"}</td>
                  <td>{row.paymentMethod || "—"}</td>
                  <td><span className={`rp-status-badge rp-status-${row.paymentStatus}`}>{row.paymentStatus}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedRow && (
        <div className="rp-appt-drawer-overlay" onClick={() => setSelectedRow(null)}>
          <div className="rp-appt-drawer" onClick={e => e.stopPropagation()}>
            <button className="rp-appt-drawer-close" onClick={() => setSelectedRow(null)}>✕</button>

            <div className="rp-appt-drawer-hero">
              <div className="rp-appt-drawer-avatar">
                {(selectedRow.clientName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="rp-appt-drawer-hero-info">
                <div className="rp-appt-drawer-client">{selectedRow.clientName || "Walk-in Client"}</div>
                <span className={`rp-status-badge rp-status-${selectedRow.status}`}>{selectedRow.status}</span>
              </div>
            </div>

            <div className="rp-appt-drawer-datetime-card">
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">📅</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Date</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.appointmentDate}</div>
                </div>
              </div>
              <div className="rp-appt-drawer-datetime-divider" />
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">🕐</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Time</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.time}</div>
                </div>
              </div>
              <div className="rp-appt-drawer-datetime-divider" />
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">⏱</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Duration</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.duration ? `${selectedRow.duration} min` : "—"}</div>
                </div>
              </div>
            </div>

            <div className="rp-appt-drawer-body">
              <div className="rp-appt-drawer-section-title">Service & Staff</div>
              <div className="rp-appt-drawer-chip-row">
                <div className="rp-appt-drawer-chip">
                  <span className="rp-appt-drawer-chip-icon">✂</span>
                  <div>
                    <div className="rp-appt-drawer-chip-label">Service</div>
                    <div className="rp-appt-drawer-chip-val">{selectedRow.serviceName}</div>
                  </div>
                </div>
                <div className="rp-appt-drawer-chip">
                  <span className="rp-appt-drawer-chip-icon">👤</span>
                  <div>
                    <div className="rp-appt-drawer-chip-label">Staff</div>
                    <div className="rp-appt-drawer-chip-val">{selectedRow.staffName || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="rp-appt-drawer-section-title rp-appt-drawer-section-title--spaced">Payment</div>
              <div className="rp-appt-drawer-payment-card">
                <div className="rp-appt-drawer-payment-amount">
                  {selectedRow.amount > 0 ? `₹${Number(selectedRow.amount).toLocaleString("en-IN")}` : "₹0"}
                  <span className="rp-appt-drawer-payment-method">{selectedRow.paymentMethod || "Not collected"}</span>
                </div>
                <span className={`rp-status-badge rp-status-${selectedRow.paymentStatus}`}>{selectedRow.paymentStatus}</span>
              </div>

              <div className="rp-appt-drawer-section-title rp-appt-drawer-section-title--spaced">Booking Info</div>
              <div className="rp-appt-drawer-meta-row">
                <span className="rp-appt-drawer-meta-label">Booked On</span>
                <span className="rp-appt-drawer-meta-val">{selectedRow.bookedDate}</span>
              </div>
              <div className="rp-appt-drawer-meta-row">
                <span className="rp-appt-drawer-meta-label">Appointment ID</span>
                <span className="rp-appt-drawer-meta-val rp-appt-drawer-id">{selectedRow.id.slice(0, 8)}…</span>
              </div>
            </div>

            <div className="rp-appt-drawer-footer">
              <button
                className="rp-appt-drawer-edit-btn"
                onClick={() => navigate("/dashboard/calendar", { state: { openAppointmentId: selectedRow.id } })}
              >
                ✏ Edit Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
