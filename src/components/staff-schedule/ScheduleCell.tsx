import React, { useRef, useState } from "react";
import type { ShiftEntry } from "./types";
import CellDropdown from "./CellDropdown";

interface ScheduleCellProps {
  shift?: ShiftEntry;
  staffId: string;
  date: string;
  onEditWorkingHours: (staffId: string, date: string) => void;
  onAddTimeOff: (staffId: string, date: string) => void;
  onManageDayOff: (staffId: string, date: string) => void;
  onManageBlockedDay: (staffId: string, date: string) => void;
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
  shift,
  staffId,
  date,
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
}) => {
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const getBgClass = () => {
    if (!shift) return "bg-white";
    switch (shift.type) {
      case "working": return "bg-[#eafaea] border-gray-200"; // Light mint/green
      case "blocked": return "bg-red-50 border-gray-200";
      case "dayoff":  return "bg-yellow-50 border-gray-200";
      default:        return "bg-white";
    }
  };

  // Empty cell (no shift assigned)
  if (!shift) {
    return (
      <div ref={cellRef} className={`relative w-full h-full min-h-[72px] ${getBgClass()}`}>
        <button
          ref={btnRef}
          className={`relative w-full min-h-[72px] border border-gray-200 flex items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-colors`}
          onClick={() => setOpen((p) => !p)}
          aria-label="Add shift"
        >
          <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 font-bold text-sm hover:border-gray-500 hover:text-gray-600 transition-colors">
            +
          </span>
        </button>
        {open && (
          <CellDropdown
            anchorRef={btnRef}
            onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
            onAddTimeOff={() => onAddTimeOff(staffId, date)}
            onManageDayOff={() => onManageDayOff(staffId, date)}
            onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // Day off cell
  if (shift.type === "dayoff") {
    return (
      <div ref={cellRef} className={`relative w-full h-full min-h-[72px] border ${getBgClass()}`}>
        <button
          ref={btnRef}
          className="absolute inset-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setOpen((p) => !p)}
          aria-label="Day off"
        >
          <span className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-gray-900 font-bold text-sm bg-gray-100/50 hover:bg-gray-200 transition-colors">
            +
          </span>
        </button>
        {open && (
          <CellDropdown
            anchorRef={btnRef}
            onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
            onAddTimeOff={() => onAddTimeOff(staffId, date)}
            onManageDayOff={() => onManageDayOff(staffId, date)}
            onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // Working / Blocked cell
  const getTextColorClass = () => {
    if (!shift) return "text-gray-400";
    if (shift.type === "blocked") return "text-red-700";
    if (shift.type === "dayoff") return "text-yellow-700";
    return "text-green-800";
  };

  const getSubTextColorClass = () => {
    if (!shift) return "text-gray-400";
    if (shift.type === "blocked") return "text-red-500";
    if (shift.type === "dayoff") return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div
      ref={cellRef}
      className={`relative w-full min-h-[72px] border ${getBgClass()} cursor-pointer transition-all hover:brightness-[0.98]`}
      onClick={() => setOpen((p) => !p)}
    >
      {/* Edit pencil icon – using styleless button for reliable click handling */}
      <button
        ref={btnRef}
        className="absolute top-0.5 right-0.5 p-1.5 text-gray-400 hover:text-gray-600 transition-colors z-10 cursor-pointer focus:outline-none"
        style={{ background: 'none', border: 'none' }}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        title="Edit Shift"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Time info */}
      <div className="px-2 py-2 text-[11px] leading-[1.4]">
        <div className={`font-bold ${getTextColorClass()}`}>{shift.startTime}</div>
        <div className={`font-bold ${getTextColorClass()}`}>{shift.endTime}</div>
        <div className={`text-[10px] font-medium ${getSubTextColorClass()} mt-0.5`}>{shift.totalHours}</div>
      </div>

      {open && (
        <CellDropdown
          anchorRef={btnRef}
          onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
          onAddTimeOff={() => onAddTimeOff(staffId, date)}
          onManageDayOff={() => onManageDayOff(staffId, date)}
          onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default ScheduleCell;
