import React from "react";
import type { StaffMember, ShiftMap } from "./types";
import ScheduleRow from "./ScheduleRow";

interface WeekDate {
  date: Date;
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
}

interface ScheduleTableProps {
  staffMembers: StaffMember[];
  weekDates: WeekDate[];
  shifts: ShiftMap;
  onEditWorkingHours: (staffId: string, date: string) => void;
  onAddTimeOff: (staffId: string, date: string) => void;
  onManageDayOff: (staffId: string, date: string) => void;
  onManageBlockedDay: (staffId: string, date: string) => void;
  onDeleteTimeBlock: (staffId: string, date: string) => void;
  onCopy: (staffId: string) => void;
  onEditStaff: (staffId: string) => void;
  isModalOpen?: boolean;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  staffMembers,
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
    <div className="sched-table">
      <table className="sched-table__el">
        <thead>
          <tr className="sched-table__head-row">
            <th className="sched-table__th-name">Name</th>
            {weekDates.map(({ dateKey, dateLabel, dayLabel }) => (
              <th key={dateKey} className="sched-table__th-date">
                <div className="sched-table__th-date-val">{dateLabel}</div>
                <div className="sched-table__th-date-day">{dayLabel}</div>
              </th>
            ))}
            <th className="sched-table__th-copy" />
          </tr>
        </thead>

        <tbody>
          {staffMembers.length === 0 ? (
            <tr>
              <td colSpan={weekDates.length + 2} className="sched-table__empty-cell">
                <div className="sched-table__empty-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="sched-table__empty-title">No staff members found</p>
                <p className="sched-table__empty-sub">Add staff members to your salon to start scheduling shifts.</p>
              </td>
            </tr>
          ) : (
            staffMembers.map((staff) => (
              <ScheduleRow
                key={staff.id}
                staff={staff}
                weekDates={weekDates}
                shifts={shifts[staff.id] ?? {}}
                onEditWorkingHours={onEditWorkingHours}
                onAddTimeOff={onAddTimeOff}
                onManageDayOff={onManageDayOff}
                onManageBlockedDay={onManageBlockedDay}
                onDeleteTimeBlock={onDeleteTimeBlock}
                onCopy={onCopy}
                onEditStaff={onEditStaff}
                isModalOpen={isModalOpen}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
