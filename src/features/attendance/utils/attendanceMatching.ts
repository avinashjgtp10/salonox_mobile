import type { StaffMember } from "@/data/teamData";
import type { AttendanceRecord, AttendanceToday } from "@/types/attendance";

type IdentifierCandidate = {
  field: string;
  value: string;
};

const toCandidates = (pairs: [string, string | null | undefined][]): IdentifierCandidate[] =>
  pairs
    .filter((pair): pair is [string, string] => Boolean(pair[1] && pair[1].trim()))
    .map(([field, value]) => ({ field, value }));

const getRecordCandidates = (record: AttendanceRecord): IdentifierCandidate[] =>
  toCandidates([
    ["attendance.staffId", record.staffId],
    ["attendance.userId", record.userId],
    ["attendance.employeeId", record.employeeId],
    ["attendance.staff._id / staff.id", record.staffRefId],
    ["attendance.id", record.id],
  ]);

const getStaffCandidates = (staffMember: Pick<StaffMember, "id" | "employeeCode">): IdentifierCandidate[] =>
  toCandidates([
    ["staff.id", staffMember.id],
    ["staff.employeeCode", staffMember.employeeCode ?? null],
  ]);

export const findAttendanceRecordForStaff = (
  records: AttendanceRecord[],
  staffMember: Pick<StaffMember, "id" | "employeeCode" | "name">,
): AttendanceRecord | undefined => {
  const staffCandidates = getStaffCandidates(staffMember);

  return records.find((record) => {
    const recordCandidates = getRecordCandidates(record);

    return recordCandidates.some((recordCandidate) =>
      staffCandidates.some((staffCandidate) => staffCandidate.value === recordCandidate.value),
    );
  });
};

export const scopeAttendanceToStaff = (
  today: AttendanceToday,
  staffMember: Pick<StaffMember, "id" | "employeeCode" | "name"> | null,
): AttendanceToday => {
  const ownRecord = staffMember ? findAttendanceRecordForStaff(today.records, staffMember) : undefined;
  const records = ownRecord ? [ownRecord] : [];
  const status = ownRecord?.statusKey;

  return {
    ...today,
    records,
    summary: {
      date: today.date,
      total: records.length,
      present: status === "present" ? 1 : 0,
      absent: status === "absent" ? 1 : 0,
      late: status === "late" ? 1 : 0,
      halfDay: status === "halfDay" ? 1 : 0,
      onLeave: status === "onLeave" ? 1 : 0,
    },
  };
};
