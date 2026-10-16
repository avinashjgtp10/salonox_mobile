import type { StaffMember } from "@/data/teamData";
import type { AttendanceRecord, AttendanceSummary } from "@/types/attendance";
import type { LeaveEntry } from "@/types/staffLeaves";
import { findAttendanceRecordForStaff } from "./attendanceMatching";

/** A display overlay; approving time off need not create an attendance row. */
export function applyApprovedLeaveToAttendance(record: AttendanceRecord | null, staff: StaffMember, date: string, leave?: LeaveEntry): AttendanceRecord | null {
  if (!leave) return record;
  return {
    avatarBg: staff.avatarBg, avatarColor: staff.avatarColor, checkInTime: null, checkOutTime: null,
    date, employeeId: staff.employeeCode ?? null, hoursWorked: null, id: "", initials: staff.initials,
    jobsToday: 0, rawStatus: "on_leave", scheduledHours: null, slotsRemaining: 0,
    staffId: staff.id, staffName: staff.name, staffRefId: staff.id,
    totalSlots: 0, updatedAt: null, userId: staff.userId ?? null,
    ...record,
    onApprovedLeave: true,
    statusKey: "onLeave",
  };
}

export function applyApprovedLeaveToSummary(summary: AttendanceSummary, records: AttendanceRecord[], staff: StaffMember[], leaves: Record<string, LeaveEntry | undefined>): AttendanceSummary {
  const next = { ...summary };
  for (const member of staff) {
    if (!leaves[member.id]) continue;
    const status = findAttendanceRecordForStaff(records, member)?.statusKey;
    if (status === "onLeave") continue;
    if (status && status !== "notMarked") next[status] = Math.max(0, next[status] - 1);
    next.onLeave += 1;
  }
  return next;
}
