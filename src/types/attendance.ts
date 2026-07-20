// Collapsed presentation status. The backend's raw attendance status (and the
// presence/absence of check-in / check-out timestamps) is mapped down to one
// of these buckets everywhere the UI needs to show a chip or color. This only
// covers staff who have an attendance record for the day — the "not marked"
// case (no record at all) is a UI-only concept, not a value in this union.
export type AttendanceStatusKey = "active" | "halfDay" | "inactive" | "late" | "onLeave";

// What action the UI should offer for a given record right now. Every staff
// member always has exactly one of these: not marked yet -> checkIn; checked
// in but not out -> checkOut; anything already recorded -> edit.
export type AttendanceActionKind = "checkIn" | "checkOut" | "edit";

// Finite set of statuses a manager can set by hand via POST /attendance/mark
// or PATCH /attendance/:id, as opposed to the system-derived check-in states.
export type ManualAttendanceStatus = "absent" | "halfDay" | "late" | "onLeave" | "present";

export type AttendanceRecord = {
  avatarBg: string;
  avatarColor: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  // Backend-reported employee code, when present as its own field distinct
  // from staffId — some backends key attendance off this instead.
  employeeId: string | null;
  // Actual hours worked today (hours_worked), when reported by the backend.
  hoursWorked: number | null;
  // The attendance record's own identifier — required for PATCH /attendance/:id.
  // Falls back to staffId when the backend does not expose a distinct one.
  id: string;
  initials: string;
  jobsToday: number;
  // Raw backend status string, kept for debugging and for future features
  // (reports, calendar) that may need finer detail than the collapsed key.
  rawStatus: string;
  slotsRemaining: number;
  staffId: string;
  staffName: string;
  // Id read from a nested `staff` / `employee` object on the raw record
  // (e.g. attendance.staff._id), when the backend nests the reference
  // instead of exposing a flat staffId/staff_id field.
  staffRefId: string | null;
  statusKey: AttendanceStatusKey;
  totalSlots: number;
  updatedAt: string | null;
  // Backend-reported auth/user id, when present as its own field distinct
  // from staffId — some backends key attendance off the user account instead
  // of the staff record.
  userId: string | null;
};

export type AttendanceToday = {
  date: string | null;
  records: AttendanceRecord[];
};

export type AttendanceSummary = {
  absent: number;
  date: string | null;
  late: number;
  onLeave: number;
  present: number;
  total: number;
};

export type CheckInResponse = {
  message?: string;
  record: AttendanceRecord | null;
};

export type CheckOutResponse = {
  message?: string;
  record: AttendanceRecord | null;
};

export type MarkAttendanceRequest = {
  date?: string;
  notes?: string;
  staffId: string;
  status: ManualAttendanceStatus;
};

export type MarkAttendanceResponse = {
  message?: string;
  record: AttendanceRecord | null;
};

export type UpdateAttendanceRequest = {
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  status?: ManualAttendanceStatus;
};

export type UpdateAttendanceResponse = {
  message?: string;
  record: AttendanceRecord | null;
};

export type AttendanceSettings = {
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  lateThresholdMinutes: number;
  updatedAt: string | null;
  workEndTime: string | null;
  workStartTime: string | null;
};

export type UpdateAttendanceSettingsRequest = {
  gracePeriodMinutes?: number;
  halfDayThresholdMinutes?: number;
  lateThresholdMinutes?: number;
  workEndTime?: string;
  workStartTime?: string;
};

export type UpdateAttendanceSettingsResponse = {
  message?: string;
  settings: AttendanceSettings;
};
