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

  const anchorRef = { current: btnRef.current ?? cellRef.current } as React.RefObject<HTMLElement | null>;

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
          className="absolute inset-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setOpen((p) => !p)}
          aria-label="Add shift"
        >
          <span className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-gray-900 font-bold text-sm bg-gray-100/50 hover:bg-gray-200 transition-colors">
            +
          </span>
        </button>
        {open && (
          <CellDropdown
            anchorRef={{ current: btnRef.current } as React.RefObject<HTMLElement | null>}
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
            anchorRef={{ current: btnRef.current } as React.RefObject<HTMLElement | null>}
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
  return (
    <div
      ref={cellRef}
      className={`relative w-full min-h-[72px] border ${getBgClass()} cursor-pointer`}
      onClick={() => setOpen((p) => !p)}
    >
      {/* Raw edit pencil icon */}
      <svg
        ref={btnRef as any}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer z-10"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        title="Edit Shift"
      >
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>

      {/* Time info */}
      <div className="px-2 py-2 text-[11px] leading-[1.4]">
        <div className="text-gray-900 font-semibold">{shift.startTime.toLowerCase()}</div>
        <div className="text-gray-900 font-semibold">{shift.endTime.toLowerCase()}</div>
        <div className="text-gray-500 mt-1 text-[10px] font-medium">{shift.totalHours}</div>
      </div>

      {open && (
        <CellDropdown
          anchorRef={{ current: cellRef.current } as React.RefObject<HTMLElement | null>}
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
