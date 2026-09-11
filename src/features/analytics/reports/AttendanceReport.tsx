import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ATTENDANCE } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, DateRangeFilter, getDateRangePresetValue, JiraFilterMenu } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
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
  // From the backend's approved-leave join (attendance.service.ts getRange) —
  // hours_worked is already zeroed for these rows there, but the flag is kept
  // separately so the table/export can show "On Leave" instead of "0.0".
  onApprovedLeave: boolean;
}

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS: FilterOption[] = [
  { id: "present", label: "Present" },
  { id: "absent", label: "Absent" },
  { id: "late", label: "Late" },
  { id: "half_day", label: "Half Day" },
  { id: "on_leave", label: "On Leave" },
];

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// dd/MM/yyyy, consistently across the date filter, table and every export.
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const fmtStatusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function AttendanceReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [staffOptions, setStaffOptions] = useState<FilterOption[]>([]);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<AttendanceRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
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
      setStaffOptions(staff.map((s: any) => ({ id: String(s.id ?? ""), label: s.full_name ?? "—" })));
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
        onApprovedLeave: r.on_approved_leave === true,
      })).sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => {
    let r = allRows;
    if (staffFilterIds.length > 0) r = r.filter(x => staffFilterIds.includes(x.staffId));
    if (statusFilter.length > 0) r = r.filter(x => statusFilter.includes(x.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.staffName.toLowerCase().includes(q) || x.staffRole.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, staffFilterIds, statusFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [rows.length]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    status: statusFilter,
  }), [staffFilterIds, statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setStatusFilter(next.status ?? []);
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 };
    rows.forEach(r => { if (r.status in c) c[r.status as keyof typeof c] += 1; });
    return c;
  }, [rows]);

  // Total Working Days = every distinct calendar date with at least one
  // attendance record in the filtered set — "days the roster was tracked",
  // not the raw row count (one day can have many staff rows).
  const totalWorkingDays = useMemo(() => new Set(rows.map(r => r.date)).size, [rows]);

  // Present / Total Working Days × 100 — matches the ticket's example
  // formula. Guards against a 0-day range dividing by zero.
  const attendancePercent = totalWorkingDays > 0 ? (counts.present / totalWorkingDays) * 100 : 0;

  // Approved leave days are excluded entirely — not just from the sum but
  // from the denominator too, so a leave day never drags the average down.
  const avgHours = useMemo(() => {
    const worked = rows.filter(r => !r.onApprovedLeave && r.hoursWorked != null);
    if (!worked.length) return 0;
    return worked.reduce((s, r) => s + (r.hoursWorked ?? 0), 0) / worked.length;
  }, [rows]);

  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hoursCell = (r: AttendanceRow) => r.onApprovedLeave ? "On Leave" : (r.hoursWorked != null ? r.hoursWorked.toFixed(1) : "—");

  const HEADERS = ["Date", "Staff", "Status", "Check In", "Check Out", "Hours Worked"];
  const exportRows = () => rows.map(r => [formatDate(r.date), r.staffName, fmtStatusLabel(r.status), fmtTime(r.checkIn), fmtTime(r.checkOut), hoursCell(r)]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`attendance-report-${dateFrom}-${dateTo}`} variant="button" csv reportId="attendance_report" />
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

      {loading ? <SkeletonStatCards count={8} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalWorkingDays}</div><div className="rp-sra-summary-label">Total Working Days</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.present}</div><div className="rp-sra-summary-label">Present</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.absent}</div><div className="rp-sra-summary-label">Absent</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.late}</div><div className="rp-sra-summary-label">Late</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.half_day}</div><div className="rp-sra-summary-label">Half Day</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{counts.on_leave}</div><div className="rp-sra-summary-label">On Leave</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{avgHours.toFixed(1)}</div><div className="rp-sra-summary-label">Average Hours Worked</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{attendancePercent.toFixed(1)}%</div><div className="rp-sra-summary-label">Attendance Percentage</div></div>
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
              <th>Date</th><th>Staff</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours Worked</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No attendance records found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{fmtStatusLabel(r.status)}</span></td>
                <td>{fmtTime(r.checkIn)}</td>
                <td>{fmtTime(r.checkOut)}</td>
                <td>{hoursCell(r)}</td>
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
