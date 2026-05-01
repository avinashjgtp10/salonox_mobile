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
    if (copyType === "day") {
      setSelectedDates((prev) => {
        const n = new Set(prev);
        n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr);
        return n;
      });
    } else {
      // Week mode: toggle all 7 days of the week containing dateStr
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
        if (allPresent) {
          weekDates.forEach(d => n.delete(d));
        } else {
          weekDates.forEach(d => n.add(d));
        }
        return n;
      });
    }
  };

  const renderCalendar = () => {
    const totalDays = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-all border-none bg-transparent"
            onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-bold text-gray-800">{MONTHS[calMonth]} {calYear}</span>
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-all border-none bg-transparent"
            onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter pb-2">{h}</div>
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
                className={`w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all border-none outline-none
                  ${isSelected ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-200" :
                    isToday ? "bg-indigo-50 text-indigo-700 font-bold" :
                    "text-gray-600 hover:bg-gray-100 bg-transparent"}`}
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1001] bg-gray-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full z-[1002] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.15)] flex flex-col animate-slide-in-right" style={{ width: 560 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Copy Schedule</h2>
            <p className="text-xs text-gray-500 mt-0.5">Bulk copy availability for {staff.name}</p>
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body – two-column layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 h-full">
            {/* Left – source */}
            <div className="px-6 py-8 border-r border-gray-100">
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Copy Range</label>
                  <select
                    value={copyType}
                    onChange={(e) => setCopyType(e.target.value as "day" | "week")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option value="day">Single Day</option>
                    <option value="week">Full Week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Source Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 italic">Select the existing schedule you want to replicate.</p>
                </div>
              </div>
            </div>

            {/* Right – target calendar */}
            <div className="px-6 py-8 bg-gray-50/50">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Select Target Dates</label>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                {renderCalendar()}
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
                <span>{selectedDates.size} days selected</span>
                <button 
                  className="text-indigo-600 font-bold hover:underline"
                  onClick={() => setSelectedDates(new Set())}
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 flex gap-3">
          <button
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
            disabled={selectedDates.size === 0 || !fromDate}
            onClick={() => {
              if (!fromDate) return;
              onSave(staff.id, fromDate, [...selectedDates], copyType);
              onClose();
            }}
          >
            Confirm & Copy
          </button>
        </div>
      </div>
    </>
  );
};

export default CopyScheduleDrawer;
