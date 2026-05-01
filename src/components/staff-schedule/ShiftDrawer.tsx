import React, { useEffect, useState } from "react";
import type { StaffMember, ShiftEntry } from "./types";
import { generateTimeOptions, calcTotalHours, formatDrawerDate } from "./utils";

const TIME_OPTS = generateTimeOptions();

interface ShiftDrawerProps {
  open: boolean;
  staff: StaffMember | null;
  date: string | null;
  shift?: ShiftEntry;
  onClose: () => void;
  onSave: (staffId: string, date: string, isAvailable: boolean, startTime: string, endTime: string) => void;
}

const ShiftDrawer: React.FC<ShiftDrawerProps> = ({
  open, staff, date, shift, onClose, onSave,
}) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState("10:30 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [breaks, setBreaks] = useState<{ id: number; start: string; end: string }[]>([]);

  useEffect(() => {
    if (open && shift) {
      setIsAvailable(shift.isAvailable);
      setStartTime(shift.startTime || "10:30 AM");
      setEndTime(shift.endTime || "09:00 PM");
      setBreaks([]); // Reset or load from shift if available
    } else if (open) {
      setIsAvailable(true);
      setStartTime("10:30 AM");
      setEndTime("09:00 PM");
      setBreaks([]);
    }
  }, [open, shift]);

  const addBreak = () => {
    setBreaks([...breaks, { id: Date.now(), start: "01:00 PM", end: "01:30 PM" }]);
  };

  const removeBreak = (id: number) => {
    setBreaks(breaks.filter((b) => b.id !== id));
  };

  const updateBreak = (id: number, field: "start" | "end", val: string) => {
    setBreaks(breaks.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  };

  const totalHours = isAvailable && startTime && endTime
    ? calcTotalHours(startTime, endTime)
    : "";

  const handleSave = () => {
    if (!staff || !date) return;
    onSave(staff.id, date, isAvailable, startTime, endTime);
    onClose();
  };

  if (!open || !staff || !date) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1001] bg-gray-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[440px] z-[1002] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.15)] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Update Availability</h2>
            <p className="text-xs text-gray-500 mt-0.5">{staff.name} &bull; {formatDrawerDate(date)}</p>
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

        {/* Body */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          {/* Availability toggle */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between mb-8">
            <span className="text-sm font-semibold text-gray-800">Staff is Available</span>
            <button
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((p) => !p)}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${
                isAvailable ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  isAvailable ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Time selectors */}
          {isAvailable && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Start Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {TIME_OPTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">End Time</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {TIME_OPTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Breaks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Breaks & Lunches</label>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{breaks.length} Scheduled</span>
                </div>
                
                {breaks.map((brk, idx) => (
                  <div key={brk.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</div>
                    <select
                      value={brk.start}
                      onChange={(e) => updateBreak(brk.id, "start", e.target.value)}
                      className="flex-1 border-none bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-300">to</span>
                    <select
                      value={brk.end}
                      onChange={(e) => updateBreak(brk.id, "end", e.target.value)}
                      className="flex-1 border-none bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button 
                      onClick={() => removeBreak(brk.id)}
                      className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                <button 
                  onClick={addBreak}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Custom Break
                </button>
              </div>

              {/* Summary Stats */}
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Total Working Hours</div>
                    <div className="text-sm font-bold text-indigo-900">{totalHours}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
            onClick={handleSave}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </>
  );
};

export default ShiftDrawer;
