import React, { useState } from "react";
import { getMonthDays, MONTHS, DAYS_ABBR } from "../../utils/timeUtils";

interface MiniCalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const [viewDate, setViewDate] = useState(
    value || new Date().toISOString().slice(0, 10),
  );
  const d = new Date(viewDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const days = getMonthDays(viewDate);

  const prevMonth = () =>
    setViewDate(new Date(year, month - 1, 1).toISOString().slice(0, 10));
  const nextMonth = () =>
    setViewDate(new Date(year, month + 1, 1).toISOString().slice(0, 10));

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,.15)",
        padding: 12,
        width: 260,
        zIndex: 999,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Nav row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ‹
        </button>

        <span
          style={{ display: "flex", gap: 6, fontWeight: 600, fontSize: 13 }}
        >
          <select
            value={month}
            onChange={(e) =>
              setViewDate(
                new Date(year, +e.target.value, 1).toISOString().slice(0, 10),
              )
            }
            style={{
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) =>
              setViewDate(
                new Date(+e.target.value, month, 1).toISOString().slice(0, 10),
              )
            }
            style={{
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => 2023 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </span>

        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {DAYS_ABBR.map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#9ca3af",
              fontWeight: 600,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {days.map((day, i) => {
          const isSelected = day === value;
          const isEmpty = !day;
          return (
            <button
              key={i}
              onClick={() => {
                if (day) {
                  onChange(day);
                  onClose();
                }
              }}
              style={{
                width: "100%",
                aspectRatio: "1",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: isEmpty ? "default" : "pointer",
                background: isSelected ? "#1f2937" : "transparent",
                color: isSelected
                  ? "#fff"
                  : isEmpty
                    ? "transparent"
                    : "#374151",
                fontWeight: isSelected ? 700 : 400,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isEmpty && !isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (!isEmpty && !isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
              }}
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
