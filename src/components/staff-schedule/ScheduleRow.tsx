import React from "react";
import type { StaffMember, ShiftEntry } from "./types";
import ScheduleCell from "./ScheduleCell";

interface WeekDate {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
}

interface ScheduleRowProps {
  staff: StaffMember;
  weekDates: WeekDate[];
  shifts: Record<string, ShiftEntry>;
  onEditWorkingHours: (staffId: string, date: string) => void;
  onAddTimeOff: (staffId: string, date: string) => void;
  onManageDayOff: (staffId: string, date: string) => void;
  onManageBlockedDay: (staffId: string, date: string) => void;
  onCopy: (staffId: string) => void;
  onEditStaff: (staffId: string) => void;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({
  staff,
  weekDates,
  shifts,
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
  onCopy,
  onEditStaff,
}) => {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="sticky left-0 z-10 bg-white border-r border-gray-200 min-w-[180px] max-w-[180px]">
        <div className="flex items-center gap-2 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: staff.avatarColor }}
          >
            {staff.initials}
          </div>
          <span className="text-sm font-medium text-gray-800 truncate flex-1">{staff.name}</span>
          
          {/* Edit staff icon – using styleless button for reliability */}
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0 p-1 focus:outline-none"
            style={{ background: 'none', border: 'none' }}
            onClick={(e) => { e.stopPropagation(); onEditStaff(staff.id); }}
            title="Edit Staff"
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
        </div>
      </td>

      {/* Shift cells */}
      {weekDates.map(({ dateKey }) => (
        <td key={dateKey} className="border-r border-gray-200 p-0 align-top w-[120px] min-w-[110px]">
          <ScheduleCell
            shift={shifts[dateKey]}
            staffId={staff.id}
            date={dateKey}
            onEditWorkingHours={onEditWorkingHours}
            onAddTimeOff={onAddTimeOff}
            onManageDayOff={onManageDayOff}
            onManageBlockedDay={onManageBlockedDay}
          />
        </td>
      ))}

      {/* Copy button column */}
      <td className="pl-2 pr-3 py-2 text-right min-w-[80px]">
        <button
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
          onClick={() => onCopy(staff.id)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy
        </button>
      </td>
    </tr>
  );
};

export default ScheduleRow;
