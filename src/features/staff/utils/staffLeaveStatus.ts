import type { StaffMember } from "@/data/teamData";
import type { LeaveEntry } from "@/types/staffLeaves";
import { attendanceDateKey } from "@/features/attendance/utils/attendanceRules";

export function getApprovedLeaveForDate(leaves: LeaveEntry[], date: string): LeaveEntry | undefined {
  return leaves.find(leave => {
    if (leave.status.trim().toLowerCase() !== "approved") return false;
    const start = attendanceDateKey(leave.startDate);
    const end = attendanceDateKey(leave.endDate);
    return Boolean(start && end && start <= date && date <= end);
  });
}

export function applyStaffLeaveStatus(member: StaffMember, leave?: LeaveEntry): StaffMember {
  if (!leave || member.status === "Inactive") return member;
  return {
    ...member,
    status: "On Leave",
    availability: "On Leave",
    availabilityLabel: "On approved leave",
    todayScheduleNote: "On approved leave",
    lastSeen: "On leave",
  };
}
