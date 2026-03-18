import React, { useState } from "react";
import { getMonthDays, MONTHS, DAYS_ABBR } from "../../utils/timeUtils";

interface MiniCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, onClose }) => {
  const [viewDate, setViewDate] = useState(value || new Date().toISOString().slice(0, 10));
  const d = new Date(viewDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const days = getMonthDays(viewDate);

  const prevMonth = () => {
    const nd = new Date(year, month - 1, 1);
    setViewDate(nd.toISOString().slice(0, 10));
  };
  const nextMonth = () => {
    const nd = new Date(year, month + 1, 1);
    setViewDate(nd.toISOString().slice(0, 10));
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__nav">
        <button onClick={prevMonth} className="btn-outline" style={{ padding: "2px 8px" }}>‹</button>
        <span style={{ fontWeight: 600, fontSize: 13, display: "flex", gap: 6 }}>
          <select
            value={month}
            onChange={e => setViewDate(new Date(year, +e.target.value, 1).toISOString().slice(0, 10))}
            style={{ border: "none", fontWeight: 600, fontSize: 13, background: "transparent", cursor: "pointer" }}
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setViewDate(new Date(+e.target.value, month, 1).toISOString().slice(0, 10))}
            style={{ border: "none", fontWeight: 600, fontSize: 13, background: "transparent", cursor: "pointer" }}
          >
            {Array.from({ length: 10 }, (_, i) => 2023 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </span>
        <button onClick={nextMonth} className="btn-outline" style={{ padding: "2px 8px" }}>›</button>
      </div>

      <div className="mini-calendar__days-header">
        {DAYS_ABBR.map(d => (
          <div key={d} className="mini-calendar__day-abbr">{d}</div>
        ))}
      </div>

      <div className="mini-calendar__grid">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => { if (day) { onChange(day); onClose(); } }}
            className={`mini-calendar__day-btn ${
              !day ? "mini-calendar__day-btn--empty" :
              day === value ? "mini-calendar__day-btn--selected" :
              "mini-calendar__day-btn--normal"
            }`}
          >
            {day ? new Date(day + "T12:00:00").getDate() : ""}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MiniCalendar;
