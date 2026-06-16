import { useState } from "react";
import {
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  ClockHistory,
  CheckCircleFill,
  XCircleFill,
  DashCircleFill,
} from "react-bootstrap-icons";
import "../styles/AttendancePage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "leave" | "half_day" | "holiday";

interface DayRecord {
  date: string;         // YYYY-MM-DD
  status: AttendanceStatus;
  clock_in?: string;    // "09:00"
  clock_out?: string;   // "18:00"
  hours?: number;
  note?: string;
}

interface StaffAttendance {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  records: DayRecord[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildEmptyMonth(year: number, month: number): DayRecord[] {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => ({
    date: `${year}-${pad(month + 1)}-${pad(i + 1)}`,
    status: "absent" as AttendanceStatus,
  }));
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; class: string }> = {
  present:  { label: "P",  class: "at-cell--present" },
  absent:   { label: "A",  class: "at-cell--absent" },
  leave:    { label: "L",  class: "at-cell--leave" },
  half_day: { label: "½",  class: "at-cell--half" },
  holiday:  { label: "H",  class: "at-cell--holiday" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const today = new Date();

function mockRecords(year: number, month: number): DayRecord[] {
  const base = buildEmptyMonth(year, month);
  return base.map((d, i) => {
    const day = i + 1;
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) return { ...d, status: "holiday" };
    if (day % 11 === 0) return { ...d, status: "absent" };
    if (day % 7 === 0)  return { ...d, status: "leave" };
    if (day % 13 === 0) return { ...d, status: "half_day", clock_in: "09:00", clock_out: "13:30", hours: 4.5 };
    return { ...d, status: "present", clock_in: "09:00", clock_out: "18:00", hours: 8 };
  });
}

const MOCK_STAFF: StaffAttendance[] = [
  { id: "1", name: "Priya Sharma",  role: "Hair Stylist",  avatar: "PS", color: AVATAR_GRADIENTS[0], records: [] },
  { id: "2", name: "Rohan Mehta",   role: "Makeup Artist", avatar: "RM", color: AVATAR_GRADIENTS[1], records: [] },
  { id: "3", name: "Anita Kulkarni",role: "Nail Tech",     avatar: "AK", color: AVATAR_GRADIENTS[2], records: [] },
];

// ─── Summary Badge ────────────────────────────────────────────────────────────

function SummaryBadges({ records }: { records: DayRecord[] }) {
  const counts = records.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; },
    {} as Record<AttendanceStatus, number>
  );
  const totalHours = records.reduce((s, r) => s + (r.hours || 0), 0);

  return (
    <div className="at-summary">
      <span className="at-sum-item at-sum-item--present">
        <CheckCircleFill size={11} /> {counts.present || 0} Present
      </span>
      <span className="at-sum-item at-sum-item--absent">
        <XCircleFill size={11} /> {counts.absent || 0} Absent
      </span>
      <span className="at-sum-item at-sum-item--leave">
        <DashCircleFill size={11} /> {counts.leave || 0} Leave
      </span>
      <span className="at-sum-item at-sum-item--hours">
        <ClockHistory size={11} /> {totalHours}h
      </span>
    </div>
  );
}

// ─── Staff Row ────────────────────────────────────────────────────────────────

function StaffRow({
  member,
  year,
  month,
  daysInMonth,
}: {
  member: StaffAttendance;
  year: number;
  month: number;
  daysInMonth: number;
}) {
  const [records, setRecords] = useState<DayRecord[]>(() => mockRecords(year, month));
  const cycleStatus = (idx: number) => {
    const order: AttendanceStatus[] = ["present", "absent", "leave", "half_day"];
    const cur = records[idx].status;
    if (cur === "holiday") return;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setRecords((prev) => prev.map((r, i) => (i === idx ? { ...r, status: next } : r)));
  };

  return (
    <div className="at-row">
      <div className="at-row-info">
        <div className="at-avatar" style={{ background: member.color }}>{member.avatar}</div>
        <div>
          <div className="at-name">{member.name}</div>
          <div className="at-role">{member.role}</div>
          <SummaryBadges records={records} />
        </div>
      </div>

      <div className="at-cells">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const rec = records[i];
          const cfg = STATUS_CONFIG[rec?.status ?? "absent"];
          const isToday =
            new Date(year, month, i + 1).toDateString() === today.toDateString();
          return (
            <button
              key={i}
              className={`at-cell ${cfg.class} ${isToday ? "at-cell--today" : ""}`}
              title={`${i + 1} — ${rec?.status ?? "absent"}${rec?.hours ? ` · ${rec.hours}h` : ""}`}
              onClick={() => cycleStatus(i)}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [search, setSearch]   = useState("");
  const [viewYear, setYear]   = useState(today.getFullYear());
  const [viewMonth, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const dayNumbers  = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    if (viewMonth === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const filtered = MOCK_STAFF.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="at-header">
        <div>
          <h2 className="at-title">Attendance</h2>
          <p className="at-subtitle">Track daily attendance for your team. Click a cell to cycle status.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="at-toolbar">
        <div className="at-search-wrap">
          <SearchIcon size={14} className="at-search-icon" />
          <input
            className="at-search"
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="at-month-nav">
          <button className="at-nav-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
          <span className="at-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button className="at-nav-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="at-legend">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`at-legend-item ${cfg.class}`}>{cfg.label} — {key.replace("_", " ")}</span>
        ))}
      </div>

      {/* Table */}
      <div className="at-table-wrap">
        {/* Day header */}
        <div className="at-table-header">
          <div className="at-col-info-header">Team member</div>
          <div className="at-day-headers">
            {dayNumbers.map((d) => {
              const dow = new Date(viewYear, viewMonth, d).getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isTod = new Date(viewYear, viewMonth, d).toDateString() === today.toDateString();
              return (
                <div key={d} className={`at-day-label ${isWeekend ? "at-day-label--weekend" : ""} ${isTod ? "at-day-label--today" : ""}`}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff rows */}
        <div className="at-rows">
          {filtered.map((m) => (
            <StaffRow
              key={m.id}
              member={m}
              year={viewYear}
              month={viewMonth}
              daysInMonth={daysInMonth}
            />
          ))}
        </div>
      </div>
    </div>
  );
}