import React, { useState, useEffect } from "react";
import type { StaffMember } from "./types";
import "./CopyScheduleDrawer.scss";

interface CopyScheduleDrawerProps {
  open: boolean;
  staff: StaffMember | null;
  currentWeekDates: string[];
  onClose: () => void;
  onSave: (staffId: string, fromDate: string, toDates: string[], type: "day" | "week") => void;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const CopyScheduleDrawer: React.FC<CopyScheduleDrawerProps> = ({
  open, staff, currentWeekDates, onClose, onSave,
}) => {
  const [copyType, setCopyType] = useState<"day" | "week">("day");
  const [fromDate, setFromDate] = useState<string>(currentWeekDates[0] ?? "");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Reset state whenever the drawer is opened so it always reflects the currently viewed week
  useEffect(() => {
    if (!open) return;
    const firstDate = currentWeekDates[0] ?? "";
    setFromDate(firstDate);
    setCopyType("day");
    setSelectedDates(new Set());
    if (firstDate) {
      const d = new Date(firstDate + "T12:00:00");
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    } else {
      const now = new Date();
      setCalYear(now.getFullYear());
      setCalMonth(now.getMonth());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // When switching to Full Week, auto-select all days of the currently viewed week
  useEffect(() => {
    if (!open) return;
    if (copyType === "week" && currentWeekDates.length > 0) {
      setSelectedDates(new Set(currentWeekDates));
      const firstDate = currentWeekDates[0];
      if (firstDate) {
        const d = new Date(firstDate + "T12:00:00");
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
    } else if (copyType === "day") {
      setSelectedDates(new Set());
    }
  }, [copyType]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDate = (dateStr: string) => {
    if (copyType === "day") {
      setSelectedDates((prev) => {
        const n = new Set(prev);
        n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr);
        return n;
      });
    } else {
      const targetDate = new Date(dateStr + "T12:00:00");
      const sunday = new Date(targetDate);
      sunday.setDate(targetDate.getDate() - targetDate.getDay());
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        weekDates.push(d.toISOString().split("T")[0]);
      }
      setSelectedDates((prev) => {
        const n = new Set(prev);
        const allPresent = weekDates.every(d => n.has(d));
        if (allPresent) { weekDates.forEach(d => n.delete(d)); }
        else { weekDates.forEach(d => n.add(d)); }
        return n;
      });
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const renderCalendar = () => {
    const totalDays = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <>
        <div className="copy-drawer__cal-nav">
          <button className="copy-drawer__cal-nav-btn" onClick={prevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="copy-drawer__cal-month">{MONTHS[calMonth]} {calYear}</span>
          <button className="copy-drawer__cal-nav-btn" onClick={nextMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="copy-drawer__cal-weekdays">
          {DAY_HEADERS.map(h => (
            <div key={h} className="copy-drawer__cal-weekday">{h}</div>
          ))}
        </div>

        <div className="copy-drawer__cal-grid">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="copy-drawer__cal-day copy-drawer__cal-day--empty" />;
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isSelected = selectedDates.has(dateStr);
            const isToday = dateStr === todayStr;
            let cls = "copy-drawer__cal-day";
            if (isSelected) cls += " copy-drawer__cal-day--selected";
            else if (isToday) cls += " copy-drawer__cal-day--today";
            return (
              <button key={dateStr} className={cls} onClick={() => toggleDate(dateStr)}>
                {day}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  if (!open || !staff) return null;

  return (
    <>
      <div className="copy-drawer__backdrop" onClick={onClose} />

      <div className="copy-drawer__panel">
        {/* Header */}
        <div className="copy-drawer__header">
          <div>
            <h2 className="copy-drawer__title">Copy Schedule</h2>
            <p className="copy-drawer__subtitle">Bulk copy availability for {staff.name}</p>
          </div>
          <button className="copy-drawer__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="copy-drawer__body">
          {/* Left: source */}
          <div className="copy-drawer__source">
            <div className="copy-drawer__field">
              <label className="copy-drawer__field-label">Copy Range</label>
              <select
                className="copy-drawer__select"
                value={copyType}
                onChange={(e) => setCopyType(e.target.value as "day" | "week")}
              >
                <option value="day">Single Day</option>
                <option value="week">Full Week</option>
              </select>
            </div>
            <div className="copy-drawer__field">
              <label className="copy-drawer__field-label">Source Date</label>
              <input
                type="date"
                className="copy-drawer__date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <p className="copy-drawer__hint">Select the existing schedule you want to replicate.</p>
            </div>
          </div>

          {/* Right: calendar */}
          <div className="copy-drawer__target">
            <span className="copy-drawer__field-label">Select Target Dates</span>
            <div className="copy-drawer__cal-card">
              {renderCalendar()}
            </div>
            <div className="copy-drawer__cal-summary">
              <span>{selectedDates.size} days selected</span>
              <button className="copy-drawer__cal-clear" onClick={() => setSelectedDates(new Set())}>
                Clear all
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="copy-drawer__footer">
          <button className="copy-drawer__cancel" onClick={onClose}>Cancel</button>
          <button
            className="copy-drawer__confirm"
            disabled={selectedDates.size === 0 || !fromDate}
            onClick={() => {
              if (!fromDate) return;
              onSave(staff.id, fromDate, [...selectedDates], copyType);
              onClose();
            }}
          >
            Confirm &amp; Copy
          </button>
        </div>
      </div>
    </>
  );
};

export default CopyScheduleDrawer;
