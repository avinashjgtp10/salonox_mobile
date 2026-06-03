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
  onDeleteTimeBlock: (staffId: string, date: string) => void;
  onCopy: (staffId: string) => void;
  onEditStaff: (staffId: string) => void;
  isModalOpen?: boolean;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({
  staff,
  weekDates,
  shifts,
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
  onDeleteTimeBlock,
  onCopy,
  onEditStaff,
  isModalOpen,
}) => {
  return (
    <tr className="sched-table__row">
      {/* Name cell */}
      <td className="sched-table__td-name">
        <div className="sched-table__staff">
          <div
            className="sched-table__avatar"
            style={{ backgroundColor: staff.avatarColor }}
          >
            {staff.initials}
          </div>
          <span className="sched-table__name">{staff.name}</span>
          <button
            className="sched-table__edit-btn"
            onClick={(e) => { e.stopPropagation(); onEditStaff(staff.id); }}
            title="Edit staff"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </td>

      {/* Shift cells */}
      {weekDates.map(({ dateKey }) => (
        <td key={`${staff.id}-${dateKey}`} className="sched-table__td-cell">
          <ScheduleCell
            shift={shifts[dateKey]}
            staffId={staff.id}
            date={dateKey}
            onEditWorkingHours={onEditWorkingHours}
            onAddTimeOff={onAddTimeOff}
            onManageDayOff={onManageDayOff}
            onManageBlockedDay={onManageBlockedDay}
            onDeleteTimeBlock={onDeleteTimeBlock}
            isModalOpen={isModalOpen}
          />
        </td>
      ))}

      {/* Copy button */}
      <td className="sched-table__td-copy">
        <button className="sched-table__copy-btn" onClick={() => onCopy(staff.id)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
