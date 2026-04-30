import React, { useState } from "react";
import type { StaffMember } from "./types";

interface CopyScheduleDrawerProps {
  open: boolean;
  staff: StaffMember | null;
  currentWeekDates: string[]; // YYYY-MM-DD list
  onClose: () => void;
  onSave: (staffId: string, fromDate: string, toDates: string[], type: "day" | "week") => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const CopyScheduleDrawer: React.FC<CopyScheduleDrawerProps> = ({
  open, staff, currentWeekDates, onClose, onSave,
}) => {
  const [copyType, setCopyType] = useState<"day" | "week">("day");
  const [fromDate, setFromDate] = useState<string>(currentWeekDates[0] ?? "");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const n = new Set(prev);
      n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr);
      return n;
    });
  };

  const renderCalendar = () => {
    const totalDays = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-3">
          <button
            className="p-1 text-gray-500 hover:text-gray-800"
            onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-semibold text-gray-700">{MONTHS[calMonth]} {calYear}</span>
          <button
            className="p-1 text-gray-500 hover:text-gray-800"
            onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-xs font-medium text-gray-400 py-1">{h}</div>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
            const isSelected = selectedDates.has(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => toggleDate(dateStr)}
                className={`w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full transition-colors
                  ${isSelected ? "bg-gray-900 text-white font-semibold" :
                    isToday ? "border-2 border-gray-900 text-gray-900 font-semibold" :
                    "text-gray-700 hover:bg-gray-100"}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!open || !staff) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl flex flex-col" style={{ width: 560 }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <button className="text-gray-400 hover:text-gray-700 transition-colors" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-800">
            Copy Schedule For &ndash; {staff.name}
          </h2>
        </div>

        {/* Body – two-column layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-gray-200 h-full">
            {/* Left – source */}
            <div className="px-5 py-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Use Shifts from selected
              </p>
              <select
                value={copyType}
                onChange={(e) => setCopyType(e.target.value as "day" | "week")}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
              </select>

              <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Right – target calendar */}
            <div className="px-5 py-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Apply to selected days
              </p>
              {renderCalendar()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-700 transition-colors shadow disabled:opacity-50"
            disabled={selectedDates.size === 0}
            onClick={() => {
              if (!fromDate) return;
              onSave(staff.id, fromDate, [...selectedDates], copyType);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};

export default CopyScheduleDrawer;
