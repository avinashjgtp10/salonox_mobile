import React from "react";
import type { StaffMember, ShiftMap, ShiftEntry } from "./types";
import { formatColHeader } from "./utils";
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
          {staffMembers.map((staff) => (
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
