import { useState, useEffect, useCallback } from "react";
import {
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  ClockHistory,
  CheckCircleFill,
  XCircleFill,
  DashCircleFill,
  Download,
  GearFill,
  CalendarCheck,
  PersonCheck,
  ExclamationCircleFill,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ATTENDANCE } from "../../../services/api/endpoints";
import "../styles/AttendancePage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "half_day" | "late" | "on_leave";

interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  source: string;
  note: string | null;
  staff_name?: string;
  staff_role?: string;
}

interface TodayStaffRecord {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  status: AttendanceStatus | "not_marked";
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  attendance_id: string | null;
}

interface DailySummary {
  date: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  half_day: number;
  total_staff: number;
}

interface AttendanceSettings {
  shift_start: string;
  shift_end: string;
  grace_minutes: number;
  min_full_day_hours: number;
  min_half_day_hours: number;
  attendance_bonus: number;
  commission_threshold_days: number;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
];

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  present:    { label: "P",  class: "at-cell--present" },
  absent:     { label: "A",  class: "at-cell--absent" },
  late:       { label: "L",  class: "at-cell--late" },
  half_day:   { label: "½",  class: "at-cell--half" },
  on_leave:   { label: "OL", class: "at-cell--leave" },
  not_marked: { label: "—",  class: "at-cell--unmarked" },
  holiday:    { label: "H",  class: "at-cell--holiday" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-based here
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function avatarColor(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

// ─── Edit Cell Modal ──────────────────────────────────────────────────────────

function EditCellModal({
  record, staffName, date, onClose, onSave,
}: {
  record: AttendanceRecord | null;
  staffName: string;
  date: string;
  onClose: () => void;
  onSave: (patch: { status: AttendanceStatus; note?: string }) => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(record?.status ?? "present");
  const [note, setNote]     = useState(record?.note ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={e => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Edit Attendance</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">{staffName} · {date}</p>
          <div className="at-modal-field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as AttendanceStatus)}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div className="at-modal-field">
            <label>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" />
          </div>
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="at-btn at-btn--primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({ status, note: note || undefined });
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Modal (Today tab) ───────────────────────────────────────────────────

function MarkModal({
  staffId, staffName, existingStatus, attendanceId,
  onClose, onDone,
}: {
  staffId: string; staffName: string;
  existingStatus: AttendanceStatus | "not_marked";
  attendanceId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(
    existingStatus === "not_marked" ? "present" : existingStatus
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  async function save() {
    setSaving(true); setError("");
    try {
      await api.post(ATTENDANCE.MARK, { staff_id: staffId, date: today, status });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to mark attendance");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={e => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Mark Attendance</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">{staffName} · Today</p>
          <div className="at-modal-field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as AttendanceStatus)}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab() {
  const [data, setData]         = useState<{ summary: DailySummary; staff: TodayStaffRecord[] } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [markTarget, setMarkTarget] = useState<TodayStaffRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ATTENDANCE.TODAY);
      setData(res.data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="at-loading">Loading today's attendance…</div>;
  if (!data)   return <div className="at-loading">Failed to load data.</div>;

  const { summary, staff } = data;
  const filtered = staff.filter(s =>
    s.staff_name.toLowerCase().includes(search.toLowerCase()) ||
    s.staff_role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Summary cards */}
      <div className="at-summary-cards">
        <div className="at-card at-card--present">
          <CheckCircleFill size={22} />
          <div>
            <div className="at-card-num">{summary.present}</div>
            <div className="at-card-label">Present</div>
          </div>
        </div>
        <div className="at-card at-card--absent">
          <XCircleFill size={22} />
          <div>
            <div className="at-card-num">{summary.absent}</div>
            <div className="at-card-label">Absent</div>
          </div>
        </div>
        <div className="at-card at-card--late">
          <ExclamationCircleFill size={22} />
          <div>
            <div className="at-card-num">{summary.late}</div>
            <div className="at-card-label">Late</div>
          </div>
        </div>
        <div className="at-card at-card--leave">
          <DashCircleFill size={22} />
          <div>
            <div className="at-card-num">{summary.on_leave}</div>
            <div className="at-card-label">On Leave</div>
          </div>
        </div>
        <div className="at-card at-card--total">
          <PersonCheck size={22} />
          <div>
            <div className="at-card-num">{summary.total_staff}</div>
            <div className="at-card-label">Total Staff</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="at-search-wrap" style={{ marginBottom: 16, maxWidth: 300 }}>
        <SearchIcon size={14} className="at-search-icon" />
        <input className="at-search" placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Staff list */}
      <div className="at-today-list">
        {filtered.map(s => {
          const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.not_marked;
          return (
            <div key={s.staff_id} className="at-today-row">
              <div className="at-today-left">
                <div className="at-avatar" style={{ background: avatarColor(s.staff_name) }}>
                  {initials(s.staff_name)}
                </div>
                <div>
                  <div className="at-name">{s.staff_name}</div>
                  <div className="at-role">{s.staff_role}</div>
                </div>
              </div>
              <div className="at-today-mid">
                <span className={`at-status-badge ${cfg.class}`}>{s.status.replace("_", " ")}</span>
                {s.check_in && (
                  <span className="at-time-info">
                    <ClockHistory size={11} /> {fmtTime(s.check_in)}
                    {s.check_out && <> → {fmtTime(s.check_out)}</>}
                    {s.hours_worked != null && <> · {s.hours_worked}h</>}
                  </span>
                )}
              </div>
              <button
                className="at-btn at-btn--sm at-btn--ghost"
                onClick={() => setMarkTarget(s)}
              >
                {s.status === "not_marked" ? "Mark" : "Edit"}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="at-empty">No staff found.</div>}
      </div>

      {markTarget && (
        <MarkModal
          staffId={markTarget.staff_id}
          staffName={markTarget.staff_name}
          existingStatus={markTarget.status}
          attendanceId={markTarget.attendance_id}
          onClose={() => setMarkTarget(null)}
          onDone={() => { setMarkTarget(null); load(); }}
        />
      )}
    </>
  );
}

// ─── Monthly Tab ──────────────────────────────────────────────────────────────

function MonthlyTab() {
  const today       = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [staff, setStaff]   = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ record: AttendanceRecord | null; staffId: string; staffName: string; date: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ATTENDANCE.MONTHLY, { params: { year, month } });
      setStaff(res.data.data.staff);
      setRecords(res.data.data.records);
    } finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const dayNumbers  = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach(r => recordMap.set(`${r.staff_id}__${r.date}`, r));

  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  async function saveEdit(patch: { status: AttendanceStatus; note?: string }) {
    if (!editing) return;
    if (editing.record) {
      await api.patch(ATTENDANCE.BY_ID(editing.record.id), patch);
    } else {
      await api.post(ATTENDANCE.MARK, {
        staff_id: editing.staffId,
        date:     editing.date,
        ...patch,
      });
    }
    setEditing(null);
    load();
  }

  return (
    <>
      {/* Toolbar */}
      <div className="at-toolbar">
        <div className="at-search-wrap">
          <SearchIcon size={14} className="at-search-icon" />
          <input className="at-search" placeholder="Search team members…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="at-month-nav">
          <button className="at-nav-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span className="at-month-label">{MONTH_NAMES[month - 1]} {year}</span>
          <button className="at-nav-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="at-legend">
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "not_marked").map(([key, cfg]) => (
          <span key={key} className={`at-legend-item ${cfg.class}`}>{cfg.label} — {key.replace("_", " ")}</span>
        ))}
      </div>

      {loading ? <div className="at-loading">Loading…</div> : (
        <div className="at-table-wrap">
          <div className="at-table-header">
            <div className="at-col-info-header">Team member</div>
            <div className="at-day-headers">
              {dayNumbers.map(d => {
                const weekend = isWeekend(year, month, d);
                const isTod   = year === today.getFullYear() && month === today.getMonth() + 1 && d === today.getDate();
                return (
                  <div key={d} className={`at-day-label ${weekend ? "at-day-label--weekend" : ""} ${isTod ? "at-day-label--today" : ""}`}>
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="at-rows">
            {filtered.map(s => {
              const staffRecords = dayNumbers.map(d => {
                const dateStr = `${year}-${pad(month)}-${pad(d)}`;
                return recordMap.get(`${s.id}__${dateStr}`) ?? null;
              });
              const counts = staffRecords.reduce((acc, r) => {
                if (r) acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const totalHours = staffRecords.reduce((sum, r) => sum + (r?.hours_worked ?? 0), 0);

              return (
                <div key={s.id} className="at-row">
                  <div className="at-row-info">
                    <div className="at-avatar" style={{ background: avatarColor(s.full_name) }}>
                      {initials(s.full_name)}
                    </div>
                    <div>
                      <div className="at-name">{s.full_name}</div>
                      <div className="at-role">{s.role}</div>
                      <div className="at-summary">
                        <span className="at-sum-item at-sum-item--present"><CheckCircleFill size={11} /> {counts.present || 0}P</span>
                        <span className="at-sum-item at-sum-item--absent"><XCircleFill size={11} /> {counts.absent || 0}A</span>
                        {counts.late > 0 && <span className="at-sum-item at-sum-item--late"><ExclamationCircleFill size={11} /> {counts.late}L</span>}
                        <span className="at-sum-item at-sum-item--hours"><ClockHistory size={11} /> {totalHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>

                  <div className="at-cells">
                    {dayNumbers.map((d, i) => {
                      const rec     = staffRecords[i];
                      const weekend = isWeekend(year, month, d);
                      const isTod   = year === today.getFullYear() && month === today.getMonth() + 1 && d === today.getDate();
                      const key     = weekend ? "holiday" : (rec?.status ?? "not_marked");
                      const cfg     = STATUS_CONFIG[key] ?? STATUS_CONFIG.not_marked;
                      const dateStr = `${year}-${pad(month)}-${pad(d)}`;

                      return (
                        <button
                          key={d}
                          className={`at-cell ${cfg.class} ${isTod ? "at-cell--today" : ""}`}
                          title={`${d} — ${key}${rec?.hours_worked ? ` · ${rec.hours_worked}h` : ""}`}
                          onClick={() => {
                            if (weekend) return;
                            setEditing({ record: rec, staffId: s.id, staffName: s.full_name, date: dateStr });
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="at-empty" style={{ padding: 24 }}>No staff found.</div>}
          </div>
        </div>
      )}

      {editing && (
        <EditCellModal
          record={editing.record}
          staffName={editing.staffName}
          date={editing.date}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [form, setForm]       = useState<AttendanceSettings>({
    shift_start: "09:00", shift_end: "18:00", grace_minutes: 15,
    min_full_day_hours: 7, min_half_day_hours: 3.5,
    attendance_bonus: 0, commission_threshold_days: 0,
  });
  const [loading, setSaving]  = useState(false);
  const [fetching, setFetch]  = useState(true);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get(ATTENDANCE.SETTINGS)
      .then(r => setForm(r.data.data))
      .catch(() => {})
      .finally(() => setFetch(false));
  }, []);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.put(ATTENDANCE.SETTINGS, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to save settings");
    } finally { setSaving(false); }
  }

  const field = (key: keyof AttendanceSettings, label: string, type: "time" | "number", step?: string) => (
    <div className="at-settings-field">
      <label>{label}</label>
      <input
        type={type}
        step={step}
        value={String(form[key])}
        onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
      />
    </div>
  );

  if (fetching) return <div className="at-loading">Loading settings…</div>;

  return (
    <div className="at-settings-form">
      <div className="at-settings-section">
        <h3 className="at-settings-section-title">Shift Hours</h3>
        <div className="at-settings-row">
          {field("shift_start",          "Shift Start",           "time")}
          {field("shift_end",            "Shift End",             "time")}
          {field("grace_minutes",        "Grace Period (min)",    "number", "1")}
        </div>
      </div>

      <div className="at-settings-section">
        <h3 className="at-settings-section-title">Status Thresholds</h3>
        <div className="at-settings-row">
          {field("min_full_day_hours",   "Min Full Day Hours",    "number", "0.5")}
          {field("min_half_day_hours",   "Min Half Day Hours",    "number", "0.5")}
        </div>
      </div>

      <div className="at-settings-section">
        <h3 className="at-settings-section-title">Bonus & Commission</h3>
        <div className="at-settings-row">
          {field("attendance_bonus",          "Attendance Bonus (₹)",      "number", "1")}
          {field("commission_threshold_days", "Commission Min Days Present","number", "1")}
        </div>
      </div>

      {error && <p className="at-settings-error">{error}</p>}
      {saved && <p className="at-settings-success">Settings saved successfully.</p>}

      <div className="at-settings-actions">
        <button className="at-btn at-btn--primary" disabled={loading} onClick={save}>
          {loading ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const today       = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  async function exportCSV() {
    setLoading(true);
    try {
      const res = await api.get(ATTENDANCE.EXPORT, {
        params: { year, month },
        responseType: "blob",
      });
      const url  = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `attendance_${year}_${pad(month)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally { setLoading(false); }
  }

  return (
    <div className="at-reports">
      <div className="at-reports-header">
        <div className="at-month-nav">
          <button className="at-nav-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span className="at-month-label">{MONTH_NAMES[month - 1]} {year}</span>
          <button className="at-nav-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>
        <button className="at-btn at-btn--primary" disabled={loading} onClick={exportCSV}>
          <Download size={14} /> {loading ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      <div className="at-reports-info">
        <CalendarCheck size={40} className="at-reports-icon" />
        <p>Select a month and click <strong>Export CSV</strong> to download the full attendance report for all staff.</p>
        <p className="at-reports-hint">The CSV includes: Date, Staff Name, Role, Status, Check-In, Check-Out, Hours Worked, Source, Note.</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "today" | "monthly" | "settings" | "reports";

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="attendance-page">
      <div className="at-header">
        <div>
          <h2 className="at-title">Attendance</h2>
          <p className="at-subtitle">Track daily attendance for your team.</p>
        </div>
      </div>

      <div className="at-tabs">
        <button className={`at-tab ${tab === "today"    ? "at-tab--active" : ""}`} onClick={() => setTab("today")}>
          Today
        </button>
        <button className={`at-tab ${tab === "monthly"  ? "at-tab--active" : ""}`} onClick={() => setTab("monthly")}>
          Monthly
        </button>
        <button className={`at-tab ${tab === "settings" ? "at-tab--active" : ""}`} onClick={() => setTab("settings")}>
          <GearFill size={13} /> Settings
        </button>
        <button className={`at-tab ${tab === "reports"  ? "at-tab--active" : ""}`} onClick={() => setTab("reports")}>
          <Download size={13} /> Reports
        </button>
      </div>

      <div className="at-tab-content">
        {tab === "today"    && <TodayTab />}
        {tab === "monthly"  && <MonthlyTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "reports"  && <ReportsTab />}
      </div>
    </div>
  );
}
