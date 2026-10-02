import { scopeAttendanceToStaff } from "@/features/attendance/utils/attendanceMatching";
import type { AttendanceRecord, AttendanceToday } from "@/types/attendance";

const record = (staffId: string, statusKey: AttendanceRecord["statusKey"]): AttendanceRecord => ({
  avatarBg: "", avatarColor: "", checkInTime: null, checkOutTime: null, date: "2026-10-02",
  employeeId: null, hoursWorked: null, id: "attendance-" + staffId, initials: "S", jobsToday: 0,
  rawStatus: statusKey, scheduledHours: null, slotsRemaining: 0, staffId, staffName: "Same Name",
  staffRefId: null, statusKey, totalSlots: 0, updatedAt: null, userId: null,
});
const staff = { id: "self", employeeCode: "EMP-1", name: "Same Name" };
const today: AttendanceToday = {
  date: "2026-10-02", records: [record("other", "present"), record("self", "late")],
  summary: { date: "2026-10-02", total: 2, present: 1, late: 1, absent: 0, halfDay: 0, onLeave: 0 },
};

test("mobile staff attendance contains only their own identity and counts", () => {
  const scoped = scopeAttendanceToStaff(today, staff);
  expect(scoped.records.map(item => item.staffId)).toEqual(["self"]);
  expect(scoped.summary).toEqual({ date: "2026-10-02", total: 1, present: 0, late: 1, absent: 0, halfDay: 0, onLeave: 0 });
  expect(today.records).toHaveLength(2);
  expect(today.summary?.total).toBe(2);
});

test("a cached team response reveals no staff data until the current identity is known", () => {
  const scoped = scopeAttendanceToStaff(today, null);
  expect(scoped.records).toEqual([]);
  expect(scoped.summary?.total).toBe(0);
  expect(scoped.summary?.present).toBe(0);
});

test("another employee with the same name is never used as the current staff record", () => {
  expect(scopeAttendanceToStaff({ ...today, records: [record("other", "present")] }, staff).records).toEqual([]);
});
