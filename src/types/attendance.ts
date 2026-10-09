export type AttendanceStatusKey = "absent" | "halfDay" | "late" | "notMarked" | "onLeave" | "present";

export type AttendanceActivity = {
  current_status: "NOT_CHECKED_IN" | "WORKING" | "ON_BREAK" | "CHECKED_OUT";
  scheduled_start: string | null; scheduled_end: string | null; scheduled_seconds: number | null;
  total_worked_seconds: number; total_break_seconds: number; break_count: number;
  active_break: AttendanceBreak | null;
  breaks: AttendanceBreak[];
  sessions: { type: "WORK" | "BREAK"; start_time: string; end_time: string | null; duration_seconds: number }[];
};
export type AttendanceBreak = {
  note?: string | null;
  id: string; planned_start: string; planned_end: string;
  actual_start: string; actual_end: string | null;
};
export type StartBreakRequest = { from: string; to: string; request_id: string; note?: string };

export type AttendanceActionKind = "checkIn" | "checkOut" | "edit";

export type ManualAttendanceStatus = "absent" | "halfDay" | "late" | "onLeave" | "present";

export type AttendanceRecord = {
  activity?: AttendanceActivity;
  avatarBg: string;
  avatarColor: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  date: string | null;
  employeeId: string | null;
  hoursWorked: number | null;
  id: string;
  initials: string;
  jobsToday: number;
  rawStatus: string;
  scheduledHours: number | null;
  slotsRemaining: number;
  staffId: string;
  staffName: string;
  staffRefId: string | null;
  statusKey: AttendanceStatusKey;
  totalSlots: number;
  updatedAt: string | null;
  userId: string | null;
};

export type AttendanceToday = {
  date: string | null;
  records: AttendanceRecord[];
  summary: AttendanceSummary | null;
};

export type AttendanceRecordList = {
  records: AttendanceRecord[];
  total: number;
};

export type AttendanceSummary = {
  absent: number;
  date: string | null;
  halfDay: number;
  late: number;
  onLeave: number;
  present: number;
  total: number;
};

export type CheckInRequest = {
  checkInTime?: string;
  location?: string;
  notes?: string;
  staffId: string;
};

export type CheckInResponse = {
  message?: string;
  record: AttendanceRecord | null;
};

export type CheckOutRequest = {
  checkOutTime?: string;
  location?: string;
  notes?: string;
  staffId: string;
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
  active: boolean;
  thresholdHours: number;
  minFullDayHours: number;
  halfDayDeductionAmount: number;
  attendanceBonus: number;
  commissionThresholdDays: number;
  staffScope: "all" | "selected";
  selectedStaffIds: string[];
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  lateThresholdMinutes: number;
  updatedAt: string | null;
  workEndTime: string | null;
  workStartTime: string | null;
};

export type UpdateAttendanceSettingsRequest = {
  active?: boolean;
  thresholdHours?: number;
  minFullDayHours?: number;
  halfDayDeductionAmount?: number;
  attendanceBonus?: number;
  commissionThresholdDays?: number;
  staffScope?: "all" | "selected";
  selectedStaffIds?: string[];
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
