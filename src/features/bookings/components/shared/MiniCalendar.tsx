import React, { useState, useEffect, useRef } from "react";
import { getMonthDays, MONTHS, DAYS_ABBR } from "../../utils/timeUtils";
import "../../styles/MiniCalendar.scss";

interface MiniCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

function toDateParts(iso: string): { year: number; month: number } {
  const d = new Date(iso + "T12:00:00");
  return { year: d.getFullYear(), month: d.getMonth() };
}

function buildIso(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, onClose }) => {
  const [viewDate, setViewDate] = useState(value || new Date().toISOString().slice(0, 10));
  const containerRef = useRef<HTMLDivElement>(null);

  const { year, month } = toDateParts(viewDate);
  const days = getMonthDays(viewDate);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  const prevMonth = () => {
    const m = month - 1;
    setViewDate(m < 0 ? buildIso(year - 1, 11) : buildIso(year, m));
  };
  const nextMonth = () => {
    const m = month + 1;
    setViewDate(m > 11 ? buildIso(year + 1, 0) : buildIso(year, m));
  };

  return (
    <div ref={containerRef} className="mini-cal">
      {/* Nav row */}
      <div className="mini-cal__nav">
        <button onClick={prevMonth} className="mini-cal__nav-btn">‹</button>

        <span className="mini-cal__month-year">
          <select
            value={month}
            onChange={(e) => setViewDate(buildIso(year, +e.target.value))}
            className="mini-cal__select"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setViewDate(buildIso(+e.target.value, month))}
            className="mini-cal__select"
          >
            {Array.from({ length: 12 }, (_, i) => 2023 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </span>

        <button onClick={nextMonth} className="mini-cal__nav-btn">›</button>
      </div>

      {/* Day headers */}
      <div className="mini-cal__day-headers">
        {DAYS_ABBR.map((day) => (
          <div key={day} className="mini-cal__day-name">{day}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mini-cal__day-grid">
        {days.map((day, i) => {
          const isSelected = day === value;
          const isEmpty = !day;
          const btnClass = [
            "mini-cal__day-btn",
            isSelected ? "mini-cal__day-btn--selected" : "",
            isEmpty    ? "mini-cal__day-btn--empty"    : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={i}
              onClick={() => { if (day) { onChange(day); onClose(); } }}
              className={btnClass}
            >
              {day ? new Date(day + "T12:00:00").getDate() : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
