import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ATTENDANCE } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, DateRangePicker } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./AttendanceReport.scss";

const REPORT_NAME = "Attendance Report";

type AttendanceStatus = "present" | "absent" | "half_day" | "late" | "on_leave";

interface AttendanceRow {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  source: string;
}

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const fmtStatusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function AttendanceReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [staffFilter, setStaffFilter] = useState("All");
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: string }[]>([{ label: "All Staff", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<AttendanceRow[]>([]);
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
      const res = await api.get(ATTENDANCE.RANGE, { params: { start_date: dateFrom, end_date: dateTo }, signal: ctrl.signal });
      const data = res.data?.data ?? {};
      const staff: any[] = Array.isArray(data.staff) ? data.staff : [];
      const records: any[] = Array.isArray(data.records) ? data.records : [];
      setStaffOptions([{ label: "All Staff", value: "All" }, ...staff.map((s: any) => ({ label: s.full_name ?? "—", value: String(s.id ?? "") }))]);
      setAllRows(records.map((r: any) => ({
        id: String(r.id ?? ""),
        date: String(r.date ?? "").slice(0, 10),
        staffId: String(r.staff_id ?? ""),
        staffName: r.staff_name ?? "—",
        staffRole: r.staff_role ?? "—",
        status: r.status ?? "absent",
        checkIn: r.check_in ?? null,
        checkOut: r.check_out ?? null,
        hoursWorked: r.hours_worked != null ? Number(r.hours_worked) : null,
        source: r.source ?? "manual",
      })).sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rows = useMemo(() => {
    let r = allRows;
    if (staffFilter !== "All") r = r.filter(x => x.staffId === staffFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.staffName.toLowerCase().includes(q) || x.staffRole.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, staffFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [rows.length]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 };
    rows.forEach(r => { if (r.status in c) c[r.status as keyof typeof c] += 1; });
    return c;
  }, [rows]);

  const avgHours = useMemo(() => {
    const worked = rows.filter(r => r.hoursWorked != null);
    if (!worked.length) return 0;
    return worked.reduce((s, r) => s + (r.hoursWorked ?? 0), 0) / worked.length;
  }, [rows]);

  const HEADERS = ["Date", "Staff", "Role", "Status", "Check In", "Check Out", "Hours Worked", "Source"];
  const exportRows = () => rows.map(r => [r.date, r.staffName, r.staffRole, fmtStatusLabel(r.status), fmtTime(r.checkIn), fmtTime(r.checkOut), r.hoursWorked ?? "—", r.source]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`attendance-report-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(s, e) => { setDateFrom(s); setDateTo(e); }} />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All Staff").slice(0, 16)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.present}</div><div className="rp-sra-summary-label">Present</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.absent}</div><div className="rp-sra-summary-label">Absent</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.late}</div><div className="rp-sra-summary-label">Late</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.half_day}</div><div className="rp-sra-summary-label">Half Day</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.on_leave}</div><div className="rp-sra-summary-label">On Leave</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{avgHours.toFixed(1)}</div><div className="rp-sra-summary-label">Avg Hours Worked</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff or role" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Staff</th><th>Role</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours Worked</th><th>Source</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No attendance records found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.staffRole}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{fmtStatusLabel(r.status)}</span></td>
                <td>{fmtTime(r.checkIn)}</td>
                <td>{fmtTime(r.checkOut)}</td>
                <td>{r.hoursWorked != null ? r.hoursWorked.toFixed(1) : "—"}</td>
                <td className="rp-att-source">{fmtStatusLabel(r.source)}</td>
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
