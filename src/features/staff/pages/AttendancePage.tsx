import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search as SearchIcon,
  CheckCircleFill,
  XCircleFill,
  DashCircleFill,
  CircleHalf,
  ExclamationCircleFill,
  Plus,
  ArrowRepeat,
  ChevronLeft,
  ChevronRight,
  HddNetwork,
  Trash3,
  PencilSquare,
  GearFill,
  Clock,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ATTENDANCE, DEVICES, STAFF } from "../../../services/api/endpoints";
import {
  DEFAULT_HALF_DAY_RULE_CONFIG,
  resolveAttendanceRuleConfig,
  evaluateAttendanceCheckIn,
} from "../../settings/utils/halfDayRuleSettings";
import HalfDayRulePage from "../../settings/pages/HalfDayRulePage";
import { scheduleDateToYMD } from "../../../components/staff-schedule/utils";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import Dropdown from "../../../components/ui/Dropdown";
import TimeDropdown from "../../../components/ui/TimeDropdown";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/AttendancePage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "half_day" | "late" | "on_leave";

interface TodayStaffRecord {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  status: AttendanceStatus | "not_marked";
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  scheduled_hours: number | null;
  attendance_id: string | null;
  source?: string;
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

type ModalState =
  | { type: "check_in";  record: TodayStaffRecord }
  | { type: "check_out"; record: TodayStaffRecord }
  | { type: "edit";      record: TodayStaffRecord }
  | null;

interface Device {
  id: string;
  serial_no: string;
  name: string;
  location: string | null;
  is_active: boolean;
  last_seen: string | null;
  last_ip: string | null;
}

interface StaffMapping {
  id: string;
  staff_id: string;
  pin: string;
  staff_name?: string;
  staff_role?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
];

const STATUS_CFG = {
  present:    { label: "Present",    badge: "ap-badge--present",  dot: "ap-dot--green"  },
  absent:     { label: "Absent",     badge: "ap-badge--absent",   dot: "ap-dot--red"    },
  late:       { label: "Late",       badge: "ap-badge--late",     dot: "ap-dot--amber"  },
  half_day:   { label: "Half Day",   badge: "ap-badge--half",     dot: "ap-dot--blue"   },
  on_leave:   { label: "On Leave",   badge: "ap-badge--leave",    dot: "ap-dot--purple" },
  not_marked: { label: "Not Marked", badge: "ap-badge--unmarked", dot: "ap-dot--gray"   },
} as const;

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual", biometric: "Biometric", qr: "QR", gps: "GPS", appointment: "Appointment",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function shiftDate(base: string, days: number): string {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function fmtDateLabel(iso: string): string {
  return formatDateDDMMYYYY(new Date(iso + "T12:00:00"));
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
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

function fmtHours(h: number | null): string {
  if (h == null) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function fmtSource(source?: string): string {
  return source ? (SOURCE_LABELS[source] ?? source) : "Manual";
}

/** Current IST time as HH:MM for <input type="time"> */
function nowIST(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Extract HH:MM in IST from a stored UTC ISO string */
function isoToTimeIST(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Build ISO timestamp from a date string + HH:MM in IST */
function toISO(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

/**
 * Look up a staff member's scheduled shift-start time (HH:MM, 24h) for a
 * given date, from the `schedule` array already embedded on their staff
 * record (see staffRepository.list on the backend — a LEFT JOIN LATERAL
 * against staff_schedules). No separate GET /staff/:id/scheduled call is
 * needed anymore now that the staff list carries this data itself.
 */
function getShiftStartTime(schedule: any[] | undefined, date: string): string | null {
  if (!Array.isArray(schedule)) return null;
  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const daySched =
    schedule.find((sch: any) => scheduleDateToYMD(sch.date) === date) ??
    schedule.find((sch: any) => !scheduleDateToYMD(sch.date) && sch.day_of_week === dayOfWeek);
  // start_time comes back as "HH:MM" already (backend formats it via
  // to_char), but slice defensively in case a raw "HH:MM:SS" ever shows up.
  return daySched?.is_available && daySched?.start_time
    ? String(daySched.start_time).slice(0, 5)
    : null;
}

// ─── 12-hour time picker (native <input type="time"> ignores the "lang" hint on
// some Chromium/OS combos and falls back to 24h — this is locale-proof) ───────

function to12hParts(time24: string): { hour: string; minute: string; period: "AM" | "PM" } {
  const [hh, mm] = (time24 || "00:00").split(":").map(Number);
  const period: "AM" | "PM" = hh < 12 ? "AM" : "PM";
  const hour = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return { hour: String(hour).padStart(2, "0"), minute: String(mm || 0).padStart(2, "0"), period };
}

function from12hParts(hour: string, minute: string, period: "AM" | "PM"): string {
  let h = parseInt(hour, 10) % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const HOUR_OPTS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTE_OPTS_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function TimeField12h({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { hour, minute, period } = to12hParts(value);
  return (
    <div className="at-time12">
      <TimeDropdown
        ariaLabel="Hour"
        value={hour}
        options={HOUR_OPTS_12}
        onChange={(h) => onChange(from12hParts(h, minute, period))}
      />
      <span className="at-time12__sep">:</span>
      <TimeDropdown
        ariaLabel="Minute"
        value={minute}
        options={MINUTE_OPTS_60}
        onChange={(m) => onChange(from12hParts(hour, m, period))}
      />
      <TimeDropdown
        ariaLabel="AM or PM"
        value={period}
        options={["AM", "PM"]}
        onChange={(p) => onChange(from12hParts(hour, minute, p as "AM" | "PM"))}
      />
    </div>
  );
}

/** Row action based on check-in/check-out state */
function rowAction(s: TodayStaffRecord): { label: string; variant: string; modalType: "check_in" | "check_out" | "edit" } {
  if (s.check_in && s.check_out) return { label: "Edit",      variant: "ap-row-btn",             modalType: "edit"      };
  if (s.check_in)                return { label: "Check Out", variant: "ap-row-btn ap-row-btn--checkout", modalType: "check_out" };
  return                                { label: "Check In",  variant: "ap-row-btn ap-row-btn--checkin",  modalType: "check_in"  };
}

// ─── Check-In Modal ───────────────────────────────────────────────────────────

function CheckInModal({ record, date, isToday, schedule, onClose, onDone }: {
  record: TodayStaffRecord;
  date: string;
  isToday: boolean;
  /** This staff member's `schedule` array, already embedded on their staff record. */
  schedule: any[] | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const [time, setTime]   = useState(isToday ? nowIST() : "09:00");
  const [note, setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [salonShiftStart, setSalonShiftStart] = useState<string | null>(null);
  const [halfDayRule, setHalfDayRule] = useState(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [settingsReady, setSettingsReady] = useState(false);

  // Shift start comes straight from the schedule already embedded on the
  // staff record — no fetch needed. Only the half-day rule settings still
  // require a network call.
  const shiftStart = getShiftStartTime(schedule, date);

  // Half-day rule is evaluated client-side: compare the check-in time against
  // (shift start + configured threshold hours). Backend just stores whatever
  // status we send — it does not compute lateness itself.
  useEffect(() => {
    let cancelled = false;
    setSettingsReady(false);

    // This GET previously had zero retry (a bare .catch(() => null)), unlike
    // every other fetch of this same endpoint in this file — a single
    // transient DB blip (this backend's connection is known to drop
    // intermittently, see the retry comments elsewhere in this file and in
    // config/database.ts) silently left halfDayRule at its default
    // (active: false), so the rule would just never apply for that check-in
    // with no visible error. Retrying matches the established pattern.
    const attempt = (n: number): Promise<any> =>
      api.get(ATTENDANCE.SETTINGS).catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attempt(n - 1));
      });

    attempt(2).catch(() => null).then((ruleRes: any) => {
      if (cancelled) return;
      if (ruleRes) {
        const settings = ruleRes.data?.data ?? ruleRes.data;
        setHalfDayRule(resolveAttendanceRuleConfig(settings));
        // Falls back to the salon's default shift start (attendance_settings.shift_start)
        // when this staff member has no per-day shift scheduled — otherwise the rule
        // would never apply to staff without an explicit Team > Schedule entry.
        // Postgres TIME columns come back as "HH:MM:SS" — truncate to "HH:MM" since
        // toISO() below appends its own ":00" seconds.
        if (settings?.shift_start) setSalonShiftStart(String(settings.shift_start).slice(0, 5));
      }
      setSettingsReady(true);
    });
    return () => { cancelled = true; };
  }, [record.staff_id, date]);

  async function save() {
    if (!time) { setError("Please enter a check-in time."); return; }
    setSaving(true); setError("");
    try {
      const checkInISO = toISO(date, time);
      const effectiveShiftStart = shiftStart ?? salonShiftStart;
      const shiftStartISO = effectiveShiftStart ? toISO(date, effectiveShiftStart) : null;
      const evaluation = evaluateAttendanceCheckIn(halfDayRule, shiftStartISO, checkInISO, record.staff_id);
      await api.post(ATTENDANCE.CHECK_IN, {
        staff_id: record.staff_id,
        check_in: checkInISO,
        status: evaluation.status,
        shift_start: effectiveShiftStart ?? undefined,
        late_minutes: evaluation.lateMinutes,
        deduction_source: evaluation.totalDeduction > 0 ? "Attendance Rule" : undefined,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to check in.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Check In</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">{record.staff_name} · {fmtDateLabel(date)}</p>
          {(() => {
            const effectiveShiftStart = shiftStart ?? salonShiftStart;
            if (!effectiveShiftStart) return null;
            return (
              <div className="at-modal-info-row">
                <span className="at-modal-info-label">
                  {shiftStart ? "Shift starts at" : "Default shift starts at"}
                </span>
                <span className="at-modal-info-value">{fmtTime(toISO(date, effectiveShiftStart))}</span>
              </div>
            );
          })()}
          <div className="at-modal-field">
            <label>Check-in Time</label>
            <TimeField12h value={time} onChange={setTime} />
          </div>
          {(() => {
            const effectiveShiftStart = shiftStart ?? salonShiftStart;
            if (!effectiveShiftStart || !time) return null;
            const evaluation = evaluateAttendanceCheckIn(halfDayRule, toISO(date, effectiveShiftStart), toISO(date, time), record.staff_id);
            return evaluation.status === "half_day" ? (
              <p className="at-modal-error">
                Late by more than {halfDayRule.threshold_hours}h — this check-in will be marked Half Day.
              </p>
            ) : evaluation.status === "late" ? (
              <p className="at-modal-error">
                Late by {evaluation.lateMinutes} min - this check-in will be marked Late.
              </p>
            ) : (
              <p className="at-modal-meta at-modal-meta--success">
                This check-in will be marked Present.
              </p>
            );
          })()}
          <div className="at-modal-field">
            <label>Note <span className="at-optional-label">(optional)</span></label>
            <input type="text" placeholder="e.g. Arrived from site" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving || !settingsReady} onClick={save}>
            {saving ? "Saving…" : !settingsReady ? "Loading…" : "Check In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Check-Out Modal ──────────────────────────────────────────────────────────

function CheckOutModal({ record, date, isToday, onClose, onDone }: {
  record: TodayStaffRecord;
  date: string;
  isToday: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [time, setTime]   = useState(isToday ? nowIST() : "18:00");
  const [note, setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function save() {
    if (!time) { setError("Please enter a check-out time."); return; }
    setSaving(true); setError("");
    try {
      await api.post(ATTENDANCE.CHECK_OUT, {
        staff_id: record.staff_id,
        check_out: toISO(date, time),
        note: note.trim() || undefined,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to check out.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Check Out</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">{record.staff_name} · {fmtDateLabel(date)}</p>
          <div className="at-modal-info-row">
            <span className="at-modal-info-label">Checked in at</span>
            <span className="at-modal-info-value">{fmtTime(record.check_in)}</span>
          </div>
          <div className="at-modal-field">
            <label>Check-out Time</label>
            <TimeField12h value={time} onChange={setTime} />
          </div>
          <div className="at-modal-field">
            <label>Note <span className="at-optional-label">(optional)</span></label>
            <input type="text" placeholder="e.g. Left early" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Check Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ record, date, onClose, onDone }: {
  record: TodayStaffRecord;
  date: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status,   setStatus]   = useState<AttendanceStatus>(
    record.status === "not_marked" ? "present" : record.status
  );
  const [checkIn,  setCheckIn]  = useState(isoToTimeIST(record.check_in));
  const [checkOut, setCheckOut] = useState(isoToTimeIST(record.check_out));
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function save() {
    setSaving(true); setError("");
    try {
      const patch: Record<string, any> = { status };
      if (checkIn)  patch.check_in  = toISO(date, checkIn);
      if (checkOut) patch.check_out = toISO(date, checkOut);

      if (record.attendance_id) {
        await api.patch(ATTENDANCE.BY_ID(record.attendance_id), patch);
      } else {
        await api.post(ATTENDANCE.MARK, { staff_id: record.staff_id, date, status });
      }
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to save.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal at-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Edit Attendance</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">{record.staff_name} · {fmtDateLabel(date)}</p>
          <div className="at-modal-field">
            <label>Status</label>
            <Dropdown
              searchable={false}
              value={status}
              options={[
                { id: "present", name: "Present" },
                { id: "absent", name: "Absent" },
                { id: "late", name: "Late" },
                { id: "half_day", name: "Half Day" },
                { id: "on_leave", name: "On Leave" },
              ]}
              onChange={(id) => setStatus(id as AttendanceStatus)}
            />
          </div>
          <div className="at-modal-row">
            <div className="at-modal-field">
              <label>Check-in Time</label>
              <TimeField12h value={checkIn} onChange={setCheckIn} />
            </div>
            <div className="at-modal-field">
              <label>Check-out Time</label>
              <TimeField12h value={checkOut} onChange={setCheckOut} />
            </div>
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

// ─── Add Device Modal ─────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [serialNo,  setSerialNo]  = useState("");
  const [name,      setName]      = useState("");
  const [location,  setLocation]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function save() {
    if (!serialNo.trim()) { setError("Serial number is required."); return; }
    if (!name.trim())     { setError("Device name is required.");   return; }
    setSaving(true); setError("");
    try {
      await api.post(DEVICES.ADD, {
        serial_no: serialNo.trim().toUpperCase(),
        name: name.trim(),
        location: location.trim() || undefined,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to add device.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Add Device</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">Enter the details printed on your biometric device.</p>
          <div className="at-modal-field">
            <label>Serial Number</label>
            <input
              type="text"
              className="at-input--upper"
              placeholder="e.g. ABRV1234567"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
            />
          </div>
          <div className="at-modal-field">
            <label>Device Name</label>
            <input type="text" placeholder="e.g. Main Entrance" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="at-modal-field">
            <label>Location <span className="at-optional-label">(optional)</span></label>
            <input type="text" placeholder="e.g. Reception" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Add Device"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connect Discovered Device Modal ─────────────────────────────────────────

type PendingDevice = { sn: string; ip: string; firstSeen: string; lastSeen: string };

function ConnectDeviceModal({ pending, onClose, onDone }: {
  pending: PendingDevice;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name,     setName]     = useState("");
  const [location, setLocation] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function connect() {
    if (!name.trim()) { setError("Give this device a name."); return; }
    setSaving(true); setError("");
    try {
      await api.post(DEVICES.CONNECT_PENDING(pending.sn), {
        name: name.trim(),
        location: location.trim() || undefined,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to connect device.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Connect Device</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">
            Device <strong>{pending.sn}</strong> connected from <strong>{pending.ip}</strong>. Give it a name to register it.
          </p>
          <div className="at-modal-field">
            <label>Device Name</label>
            <input type="text" placeholder="e.g. Main Entrance" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="at-modal-field">
            <label>Location <span className="at-optional-label">(optional)</span></label>
            <input type="text" placeholder="e.g. Reception" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving} onClick={connect}>
            {saving ? "Connecting…" : "Connect Device"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Device Modal ────────────────────────────────────────────────────────

function EditDeviceModal({ device, onClose, onDone }: {
  device: Device;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name,     setName]     = useState(device.name);
  const [location, setLocation] = useState(device.location ?? "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function save() {
    if (!name.trim()) { setError("Device name is required."); return; }
    setSaving(true); setError("");
    try {
      await api.patch(DEVICES.BY_ID(device.id), {
        name: name.trim(),
        location: location.trim() || null,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to update device.");
    } finally { setSaving(false); }
  }

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Edit Device</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">SN: {device.serial_no}</p>
          <div className="at-modal-field">
            <label>Device Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="at-modal-field">
            <label>Location <span className="at-optional-label">(optional)</span></label>
            <input type="text" placeholder="e.g. Reception" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          {error && <p className="at-modal-error">{error}</p>}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn at-btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Staff PINs Modal ──────────────────────────────────────────────────

function ManagePinsModal({
  device,
  allStaff,
  onClose,
}: {
  device: Device;
  allStaff: TodayStaffRecord[];
  onClose: () => void;
}) {
  const [mappings,  setMappings]  = useState<StaffMapping[]>([]);
  const [loadingM,  setLoadingM]  = useState(true);
  const [staffId,   setStaffId]   = useState("");
  const [pin,       setPin]       = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function loadMappings() {
    setLoadingM(true);
    try {
      const res = await api.get(DEVICES.MAPPINGS(device.id));
      setMappings(res.data.data);
    } finally { setLoadingM(false); }
  }

  useEffect(() => { loadMappings(); }, [device.id]);

  async function addMapping() {
    if (!staffId) { setError("Select a staff member."); return; }
    const trimmedPin = pin.trim();
    if (!trimmedPin) { setError("Enter the PIN from the device."); return; }
    if (!/^\d+$/.test(trimmedPin)) { setError("PIN must be a number (e.g. 3 or 12345)."); return; }
    if (parseInt(trimmedPin, 10) < 1) { setError("PIN must be a positive number."); return; }
    setSaving(true); setError("");
    try {
      await api.post(DEVICES.MAPPINGS(device.id), { staff_id: staffId, pin: trimmedPin });
      setStaffId(""); setPin("");
      loadMappings();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to add mapping.");
    } finally { setSaving(false); }
  }

  async function removeMapping(mappingId: string) {
    try {
      await api.delete(DEVICES.MAPPING(device.id, mappingId));
      loadMappings();
    } catch { /* silent */ }
  }

  const unmapped = allStaff.filter((s) => !mappings.some((m) => m.staff_id === s.staff_id));

  return (
    <div className="at-modal-overlay" onClick={onClose}>
      <div className="at-modal at-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="at-modal-header">
          <span className="at-modal-title">Staff PINs — {device.name}</span>
          <button className="at-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="at-modal-body">
          <p className="at-modal-meta">
            Map each staff member's enrollment number (PIN) from the device to their profile.
          </p>

          {/* Existing mappings */}
          {loadingM ? (
            <p className="at-modal-meta">Loading…</p>
          ) : mappings.length === 0 ? (
            <p className="at-modal-meta">No staff mapped yet.</p>
          ) : (
            <div className="ap-pin-table">
              {mappings.map((m) => (
                <div key={m.id} className="ap-pin-row">
                  <span className="ap-pin-badge">PIN {m.pin}</span>
                  <span className="ap-pin-name">{m.staff_name}</span>
                  <span className="ap-pin-role">{m.staff_role}</span>
                  <button className="ap-pin-remove" onClick={() => removeMapping(m.id)} title="Remove">
                    <Trash3 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new mapping */}
          {unmapped.length > 0 && (
            <div className="ap-pin-add">
              <div className="at-modal-row">
                <div className="at-modal-field at-modal-field--flush">
                  <label>Staff Member</label>
                  <Dropdown
                    placeholder="Select staff…"
                    value={staffId}
                    options={unmapped.map((s) => ({ id: s.staff_id, name: s.staff_name }))}
                    onChange={setStaffId}
                  />
                </div>
                <div className="at-modal-field at-modal-field--flush">
                  <label>Device PIN</label>
                  <input type="text" placeholder="e.g. 3" value={pin} onChange={(e) => setPin(e.target.value)} />
                </div>
              </div>
              {error && <p className="at-modal-error">{error}</p>}
              <button className="at-btn at-btn--primary ap-pin-add__submit" disabled={saving} onClick={addMapping}>
                {saving ? "Adding…" : "Add Mapping"}
              </button>
            </div>
          )}
        </div>
        <div className="at-modal-footer">
          <button className="at-btn at-btn--primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayIST);
  const [data, setData]         = useState<{ summary: DailySummary; staff: TodayStaffRecord[] } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<ModalState>(null);
  const [showHalfDayRule, setShowHalfDayRule] = useState(false);
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  // staffId -> schedule[], fetched once from the staff list (which now embeds
  // each member's schedule server-side) so the Check-In modal can look up a
  // shift start synchronously instead of a separate GET .../scheduled call.
  const [staffSchedules, setStaffSchedules] = useState<Record<string, any[]>>({});
  useEffect(() => {
    let cancelled = false;
    api.get(STAFF.BASE).then((res) => {
      if (cancelled) return;
      const items = res.data?.data?.items || res.data?.data || [];
      const map: Record<string, any[]> = {};
      if (Array.isArray(items)) {
        items.forEach((s: any) => { map[s.id] = Array.isArray(s.schedule) ? s.schedule : []; });
      }
      setStaffSchedules(map);
    }).catch(() => { /* non-critical — Check-In falls back to the salon default shift time */ });
    return () => { cancelled = true; };
  }, []);

  // Lock background scroll while the modal is open — otherwise the page's own
  // scrollbar (e.g. the wide attendance table) stays interactive underneath
  // the fixed overlay, visible right below the modal's footer buttons.
  useEffect(() => {
    if (!showHalfDayRule) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [showHalfDayRule]);

  // ── Devices ──
  const [devices,       setDevices]       = useState<Device[]>([]);
  const [pending,       setPending]       = useState<PendingDevice[]>([]);
  const [addDevice,     setAddDevice]     = useState(false);
  const [pinDevice,     setPinDevice]     = useState<Device | null>(null);
  const [editDevice,    setEditDevice]    = useState<Device | null>(null);
  const [connectTarget, setConnectTarget] = useState<PendingDevice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function deleteDevice(id: string) {
    try {
      await api.delete(DEVICES.BY_ID(id));
      setDeleteConfirm(null);
      loadDevices();
    } catch { /* silent */ }
  }

  const isToday = selectedDate === todayIST();

  const loadDevices = useCallback(async () => {
    try {
      const [devRes, pendRes] = await Promise.all([
        api.get(DEVICES.LIST),
        api.get(DEVICES.PENDING),
      ]);
      setDevices(devRes.data.data);
      setPending(pendRes.data.data);
    } catch { /* silent — devices section just stays empty */ }
  }, []);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 30_000);
    return () => clearInterval(interval);
  }, [loadDevices]);

  const load = useCallback(async (date: string, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    // Auto-retry twice with a short backoff before surfacing an error —
    // the DB connection is prone to transient blips, and a single failed
    // attempt would otherwise force a manual page reload every time.
    const attempt = (n: number): Promise<any> =>
      api.get(ATTENDANCE.TODAY, { params: { date } }).catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attempt(n - 1));
      });
    try {
      const res = await attempt(2);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Failed to load attendance data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(selectedDate); }, [selectedDate, load]);

  const summary  = data?.summary;
  const staff    = data?.staff ?? [];
  const filtered = staff.filter(
    (s) =>
      s.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      s.staff_role.toLowerCase().includes(search.toLowerCase())
  );

  function closeModal() { setModal(null); }
  function doneModal()  { setModal(null); load(selectedDate, true); }

  return (
    <div className="attendance-page">

      {/* ── Header ── */}
      <div className="ap-header">
        <div>
          <h2 className="ap-title">Attendance</h2>
          <p className="ap-subtitle">Track staff attendance for any date.</p>
        </div>
        <div className="ap-header-actions">
          <button
            className="ap-btn ap-btn--outline ap-btn--icon"
            onClick={() => load(selectedDate, true)}
            disabled={refreshing}
            title="Refresh"
          >
            <ArrowRepeat size={15} className={refreshing ? "ap-spin" : ""} />
          </button>
          <button
            className="ap-btn ap-btn--primary"
            style={!can("view_attendance_rules") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={() => {
              if (!can("view_attendance_rules")) { denyPerm("view_attendance_rules"); return; }
              setShowHalfDayRule(true);
            }}
          >
            <Clock size={15} />
            Attendance Rules
          </button>
        </div>
      </div>

      {showHalfDayRule && (
        <div className="hd-modal-overlay" onClick={() => setShowHalfDayRule(false)}>
          <div className="hd-modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="hd-modal-close" onClick={() => setShowHalfDayRule(false)}>×</button>
            <HalfDayRulePage onClose={() => setShowHalfDayRule(false)} />
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="ap-summary-grid">
        <div className="ap-stat-card">
          <div className="ap-stat-icon ap-stat-icon--green"><CheckCircleFill size={18} /></div>
          <div>
            <div className="ap-stat-num ap-stat-num--green">{loading ? "—" : summary?.present ?? 0}</div>
            <div className="ap-stat-label">Present</div>
          </div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-icon ap-stat-icon--amber"><ExclamationCircleFill size={18} /></div>
          <div>
            <div className="ap-stat-num ap-stat-num--amber">{loading ? "—" : summary?.late ?? 0}</div>
            <div className="ap-stat-label">Late</div>
          </div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-icon ap-stat-icon--red"><XCircleFill size={18} /></div>
          <div>
            <div className="ap-stat-num ap-stat-num--red">{loading ? "—" : summary?.absent ?? 0}</div>
            <div className="ap-stat-label">Absent</div>
          </div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-icon ap-stat-icon--purple"><DashCircleFill size={18} /></div>
          <div>
            <div className="ap-stat-num ap-stat-num--purple">{loading ? "—" : summary?.on_leave ?? 0}</div>
            <div className="ap-stat-label">On Leave</div>
          </div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-icon ap-stat-icon--blue"><CircleHalf size={18} /></div>
          <div>
            <div className="ap-stat-num ap-stat-num--blue">{loading ? "—" : summary?.half_day ?? 0}</div>
            <div className="ap-stat-label">Half Day</div>
          </div>
        </div>
      </div>

      {/* ── Staff Attendance Table ── */}
      <div className="ap-card">
        <div className="ap-card-header">
          <div>
            <h3 className="ap-card-title">Staff Attendance</h3>
          </div>

          {/* ── Date Navigation ── */}
          <div className="ap-date-nav">
            <button className="ap-date-nav__arrow" onClick={() => setSelectedDate((d) => shiftDate(d, -1))} title="Previous day">
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              className="ap-date-nav__input"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            />
            <button
              className="ap-date-nav__arrow"
              onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
              disabled={isToday}
              title="Next day"
            >
              <ChevronRight size={14} />
            </button>
            {!isToday && (
              <button className="ap-date-nav__today" onClick={() => setSelectedDate(todayIST())}>
                Today
              </button>
            )}
          </div>

          <div className="ap-search-wrap">
            <SearchIcon size={13} className="ap-search-icon" />
            <input
              className="ap-search"
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="ap-loading">Loading attendance…</div>
        ) : error ? (
          <div className="ap-error">
            <p>{error}</p>
            <button className="at-btn at-btn--ghost ap-error-retry-btn" onClick={() => load(selectedDate)}>
              Retry
            </button>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ap-table-empty">
                      {search ? "No staff match your search." : `No records for ${fmtDateLabel(selectedDate)}.`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const cfg    = STATUS_CFG[s.status] ?? STATUS_CFG.not_marked;
                    const action = rowAction(s);
                    return (
                      <tr key={s.staff_id}>
                        <td>
                          <div className="ap-member">
                            <div className="ap-avatar" style={{ "--avatar-bg": avatarColor(s.staff_name) } as React.CSSProperties}>
                              {initials(s.staff_name)}
                            </div>
                            <div>
                              <div className="ap-member-name">{s.staff_name}</div>
                              <div className="ap-member-role">{s.staff_role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="ap-td-mono">{fmtTime(s.check_in)}</td>
                        <td className="ap-td-mono">{fmtTime(s.check_out)}</td>
                        <td className="ap-td-mono">
                          {s.hours_worked != null ? (
                            fmtHours(s.hours_worked)
                          ) : s.scheduled_hours != null ? (
                            <span className="ap-scheduled-hours">
                              {fmtHours(s.scheduled_hours)}
                              <span className="ap-scheduled-label">scheduled</span>
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <span className="ap-source-chip">{fmtSource(s.source)}</span>
                        </td>
                        <td>
                          <span className={`ap-badge ${cfg.badge}`}>
                            <span className={`ap-dot ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className={action.variant}
                            onClick={() => setModal({ type: action.modalType, record: s })}
                          >
                            {action.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Connected Devices ── */}
      <div className="ap-card">
        <div className="ap-card-header">
          <div>
            <h3 className="ap-card-title">Connected Devices</h3>
            <p className="ap-card-subtitle">Biometric / QR / card machines pushing attendance to this system.</p>
          </div>
          <button className="ap-btn ap-btn--primary" onClick={() => setAddDevice(true)}>
            <Plus size={15} /> Add Device
          </button>
        </div>

        {/* ── Discovered (unregistered) devices ── */}
        {pending.length > 0 && (
          <div className="ap-discovered-banner">
            <HddNetwork size={16} className="ap-discovered-banner__icon" />
            <span className="ap-discovered-banner__label">
              {pending.length} device{pending.length > 1 ? "s" : ""} discovered on your network
            </span>
            <div className="ap-discovered-list">
              {pending.map((pd) => (
                <div key={pd.sn} className="ap-discovered-row">
                  <span className="ap-discovered-sn">SN: {pd.sn}</span>
                  <span className="ap-discovered-ip">{pd.ip}</span>
                  <button className="ap-device-edit-btn" onClick={() => setConnectTarget(pd)}>
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="ap-devices-empty">
            <HddNetwork size={32} className="ap-devices-empty__icon" />
            <p>No devices connected yet.</p>
            <span>Add a device and point it to this server — it will push attendance automatically.</span>
          </div>
        ) : (
          <div className="ap-devices-grid">
            {devices.map((d) => {
              const lastSeenMs = d.last_seen ? Date.now() - new Date(d.last_seen).getTime() : null;
              const online = lastSeenMs !== null && lastSeenMs < 2 * 60 * 1000;
              return (
                <div key={d.id} className="ap-device-card">
                  <div className="ap-device-card__header">
                    <div className={`ap-device-status ${online ? "ap-device-status--online" : "ap-device-status--offline"}`}>
                      <span className="ap-device-status__dot" />
                      {online ? "Online" : "Offline"}
                    </div>
                    <div className="ap-device-card__actions">
                      <button className="ap-device-edit-btn" onClick={() => setPinDevice(d)} title="Staff PINs">
                        <PencilSquare size={13} /> Staff PINs
                      </button>
                      <button className="ap-device-edit-btn" onClick={() => setEditDevice(d)} title="Edit device">
                        <GearFill size={12} />
                      </button>
                      {deleteConfirm === d.id ? (
                        <span className="ap-device-delete-confirm">
                          <button className="ap-device-delete-btn ap-device-delete-btn--yes" onClick={() => deleteDevice(d.id)}>Yes</button>
                          <button className="ap-device-delete-btn" onClick={() => setDeleteConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <button className="ap-device-edit-btn ap-device-edit-btn--danger" onClick={() => setDeleteConfirm(d.id)} title="Remove device">
                          <Trash3 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="ap-device-card__name">{d.name}</div>
                  <div className="ap-device-card__serial">SN: {d.serial_no}</div>
                  {d.location && <div className="ap-device-card__loc">{d.location}</div>}
                  <div className="ap-device-card__lastseen">
                    {d.last_seen
                      ? `Last seen ${new Date(d.last_seen).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")} ${new Date(d.last_seen).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })}`
                      : "Never connected"}
                  </div>
                  {d.last_ip && <div className="ap-device-card__ip">IP: {d.last_ip}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Attendance Modals ── */}
      {modal?.type === "check_in"  && <CheckInModal  record={modal.record} date={selectedDate} isToday={isToday} schedule={staffSchedules[modal.record.staff_id]} onClose={closeModal} onDone={doneModal} />}
      {modal?.type === "check_out" && <CheckOutModal record={modal.record} date={selectedDate} isToday={isToday} onClose={closeModal} onDone={doneModal} />}
      {modal?.type === "edit"      && <EditModal     record={modal.record} date={selectedDate} onClose={closeModal} onDone={doneModal} />}

      {/* ── Device Modals ── */}
      {connectTarget && (
        <ConnectDeviceModal
          pending={connectTarget}
          onClose={() => setConnectTarget(null)}
          onDone={() => { setConnectTarget(null); loadDevices(); }}
        />
      )}
      {addDevice && (
        <AddDeviceModal
          onClose={() => setAddDevice(false)}
          onDone={() => { setAddDevice(false); loadDevices(); }}
        />
      )}
      {editDevice && (
        <EditDeviceModal
          device={editDevice}
          onClose={() => setEditDevice(null)}
          onDone={() => { setEditDevice(null); loadDevices(); }}
        />
      )}
      {pinDevice && (
        <ManagePinsModal
          device={pinDevice}
          allStaff={staff}
          onClose={() => setPinDevice(null)}
        />
      )}
    </div>
  );
}
