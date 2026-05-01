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
  onCopy: (staffId: string) => void;
  onEditStaff: (staffId: string) => void;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  staffMembers,
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
    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
      <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
        <thead>
          <tr className="bg-gray-900 text-white">
            {/* Name header */}
            <th className="sticky left-0 z-20 bg-gray-900 text-left px-3 py-3 font-semibold text-sm border-r border-gray-700 min-w-[180px]">
              Name
            </th>

            {/* Date headers */}
            {weekDates.map(({ dateKey, dateLabel, dayLabel }) => (
              <th
                key={dateKey}
                className="text-center px-2 py-2.5 font-medium border-r border-gray-700 min-w-[110px]"
              >
                <div className="text-xs font-semibold">{dateLabel}</div>
                <div className="text-xs font-normal text-gray-400 mt-0.5">{dayLabel}</div>
              </th>
            ))}

            {/* Copy column header – empty */}
            <th className="min-w-[80px] border-r-0" />
          </tr>
        </thead>

        <tbody>
          {staffMembers.length === 0 ? (
            <tr>
              <td colSpan={weekDates.length + 2} className="py-20 text-center">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600">No staff members found</p>
                  <p className="text-sm text-gray-400 mt-1">Add staff members to your salon to start scheduling shifts.</p>
                </div>
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
                onCopy={onCopy}
                onEditStaff={onEditStaff}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
