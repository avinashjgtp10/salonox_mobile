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

  useEffect(() => {
    if (open && shift) {
      setIsAvailable(shift.isAvailable);
      setStartTime(shift.startTime || "10:30 AM");
      setEndTime(shift.endTime || "09:00 PM");
    } else if (open) {
      setIsAvailable(true);
      setStartTime("10:30 AM");
      setEndTime("09:00 PM");
    }
  }, [open, shift]);

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
        className="fixed inset-0 z-40 bg-black bg-opacity-20"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <button
            className="text-gray-400 hover:text-gray-700 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-800">
            Update Availability &ndash; {staff.name} &ndash; {formatDrawerDate(date)}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {/* Availability toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((p) => !p)}
              className={`relative inline-flex w-12 h-6 rounded-full transition-colors focus:outline-none ${
                isAvailable ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">Staff Availability</span>
          </div>

          {/* Time selectors – only when available */}
          {isAvailable && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Start time */}
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {TIME_OPTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* End time */}
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {TIME_OPTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Total hours display */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>{totalHours}</span>
              </div>

              {/* Add Break */}
              <button className="ml-auto inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Break
              </button>
            </div>
          )}
        </div>

        {/* Footer with Save */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-700 transition-colors shadow"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};

export default ShiftDrawer;
