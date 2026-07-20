import type { StaffMember } from "@/data/teamData";
import type { AttendanceRecord } from "@/types/attendance";

type IdentifierCandidate = {
  field: string;
  value: string;
};

const toCandidates = (pairs: [string, string | null | undefined][]): IdentifierCandidate[] =>
  pairs
    .filter((pair): pair is [string, string] => Boolean(pair[1] && pair[1].trim()))
    .map(([field, value]) => ({ field, value }));

// Every plausible identifier the attendance API might use to reference a
// staff member. Do NOT assume it's staffId — backends vary, so all of these
// are tried.
const getRecordCandidates = (record: AttendanceRecord): IdentifierCandidate[] =>
  toCandidates([
    ["attendance.staffId", record.staffId],
    ["attendance.userId", record.userId],
    ["attendance.employeeId", record.employeeId],
    ["attendance.staff._id / staff.id", record.staffRefId],
    ["attendance.id", record.id],
  ]);

// Every plausible identifier the Staff module exposes for the same person.
const getStaffCandidates = (staffMember: Pick<StaffMember, "id" | "employeeCode">): IdentifierCandidate[] =>
  toCandidates([
    ["staff.id", staffMember.id],
    ["staff.employeeCode", staffMember.employeeCode ?? null],
  ]);

// Finds the attendance record for a staff member by trying every identifier
// the backend could plausibly use to link the two records, instead of
// assuming attendance.staffId === staff.id.
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
