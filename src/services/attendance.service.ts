import { api } from "@/services/api";
import { ATTENDANCE } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatusKey,
  AttendanceSummary,
  AttendanceToday,
  CheckInResponse,
  CheckOutResponse,
  ManualAttendanceStatus,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  UpdateAttendanceRequest,
  UpdateAttendanceResponse,
  UpdateAttendanceSettingsRequest,
  UpdateAttendanceSettingsResponse,
} from "@/types/attendance";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

// Fallback used only when the backend attendance record does not (yet) carry
// a per-staff daily job capacity. Mirrors the daily-slot assumption already
// shipped in the dashboard's staff workload view. Replace once the attendance
// API exposes a real capacity field.
const DEFAULT_DAILY_JOB_CAPACITY = 8;

const AVATAR_PALETTE = [
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
] as const;

const getAvatarTone = (id: string) => {
  const hash = id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "ST"
  );
};

// Single source of truth for the STATUS MAPPING contract:
//   Present + Checked In -> Active
//   Late                 -> Late
//   Absent                -> Inactive
//   On Leave              -> On Leave
//   Checked Out           -> Inactive
//   Half Day              -> Half Day
const toAttendanceStatusKey = (rawStatus: string): AttendanceStatusKey => {
  const normalized = rawStatus.toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "present":
    case "checked_in":
    case "active":
      return "active";
    case "late":
      return "late";
    case "half_day":
    case "halfday":
      return "halfDay";
    case "on_leave":
    case "leave":
      return "onLeave";
    case "checked_out":
    case "absent":
    case "inactive":
      return "inactive";
    default:
      return "inactive";
  }
};

// Inverse of the mapping above, for the manual-marking contract: converts the
// finite UI status set to the wire value the backend expects.
const MANUAL_STATUS_TO_WIRE_VALUE: Record<ManualAttendanceStatus, string> = {
  absent: "absent",
  halfDay: "half_day",
  late: "late",
  onLeave: "on_leave",
  present: "present",
};

const toManualStatusWireValue = (status: ManualAttendanceStatus) => MANUAL_STATUS_TO_WIRE_VALUE[status];

type AttendanceRecordApiItem = UnknownRecord;

type AttendanceTodayApiData =
  | AttendanceRecordApiItem[]
  | {
      attendance?: AttendanceRecordApiItem[] | null;
      data?: AttendanceRecordApiItem[] | null;
      date?: string | null;
      items?: AttendanceRecordApiItem[] | null;
      records?: AttendanceRecordApiItem[] | null;
      rows?: AttendanceRecordApiItem[] | null;
      // The actual backend contract: GET /attendance/today returns
      // { summary: {...}, staff: [...] }. Listed first in getTodayArray's
      // key search since this is the confirmed real shape.
      staff?: AttendanceRecordApiItem[] | null;
    };

type AttendanceSummaryApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      summary?: UnknownRecord | null;
    };

type AttendanceRecordEnvelope =
  | AttendanceRecordApiItem
  | {
      attendance?: AttendanceRecordApiItem | null;
      data?: AttendanceRecordApiItem | null;
      record?: AttendanceRecordApiItem | null;
    };

type AttendanceSettingsEnvelope =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      settings?: UnknownRecord | null;
    };

type AttendanceTodayApiResponse = ApiResponse<AttendanceTodayApiData>;
type AttendanceSummaryApiResponse = ApiResponse<AttendanceSummaryApiData>;
type AttendanceRecordApiResponse = ApiResponse<AttendanceRecordEnvelope>;
type AttendanceSettingsApiResponse = ApiResponse<AttendanceSettingsEnvelope>;

const getTodayArray = (payload: AttendanceTodayApiData) => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  // "staff" is the confirmed real key ({ summary, staff } contract) and is
  // checked first; the rest remain as defensive fallbacks only.
  return firstArray(asRecord(payload), ["staff", "records", "attendance", "items", "rows", "data"]);
};

const getTodayDate = (payload: AttendanceTodayApiData) =>
  Array.isArray(payload) ? null : toSafeString(payload.date) || null;

const getSummaryRecord = (payload: AttendanceSummaryApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["summary", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const getRecordFromEnvelope = (payload: AttendanceRecordEnvelope): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["record", "attendance", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeAttendanceRecord = (entry: UnknownRecord): AttendanceRecord | null => {
  // The record's own primary key, required for PATCH /attendance/:id. GET
  // /attendance/today returns one row per staff member even when they have
  // never been marked (status: "not_marked", attendance_id: null) — those
  // rows have no real id and must not be treated as an editable record (see
  // the recordId check below).
  const recordId = toSafeString(firstValue(entry, ["id", "_id", "attendanceId", "attendance_id"]));

  // The staff reference may be nested (e.g. { staff: { id, _id } } or
  // { employee: { id, _id } }) instead of a flat field on the record.
  const nestedStaff = asRecord(firstValue(entry, ["staff", "employee", "staffMember", "staff_member"]));
  const staffRefId = toSafeString(firstValue(nestedStaff, ["id", "_id", "staffId", "staff_id", "uuid"])) || null;
  const userId = toSafeString(firstValue(entry, ["userId", "user_id"])) || null;
  const employeeId = toSafeString(firstValue(entry, ["employeeId", "employee_id", "employeeCode", "employee_code"])) || null;

  const explicitStaffId = toSafeString(firstValue(entry, ["staffId", "staff_id"]));
  const staffId = explicitStaffId || staffRefId || userId || employeeId || recordId;

  if (!staffId) {
    return null;
  }

  // No real attendance id means this staff member hasn't been marked yet
  // today (the "not_marked" row GET /attendance/today always returns).
  // Falling back to the staff id here would let a later Edit action PATCH
  // /attendance/{staffId} — a staff row id, not an attendance row id —
  // which the backend cannot resolve. Treat it as "no record" instead, so
  // the UI correctly offers Check In rather than Edit.
  if (!recordId) {
    return null;
  }

  const id = recordId;

  const staffName = toSafeString(
    firstValue(entry, ["staffName", "staff_name", "name", "fullName", "full_name"]),
    "Staff Member",
  );
  const rawStatus = toSafeString(firstValue(entry, ["status", "attendanceStatus", "attendance_status"]));
  const checkInTime =
    toSafeString(
      firstValue(entry, ["checkInTime", "check_in_time", "check_in", "checkedInAt", "checked_in_at"]),
    ) || null;
  const checkOutTime =
    toSafeString(
      firstValue(entry, ["checkOutTime", "check_out_time", "check_out", "checkedOutAt", "checked_out_at"]),
    ) || null;
  const hoursWorkedRaw = firstValue(entry, ["hoursWorked", "hours_worked"]);
  const hoursWorked = hoursWorkedRaw !== undefined ? toSafeNumber(hoursWorkedRaw) : null;
  const jobsToday = toSafeNumber(
    firstValue(entry, ["jobsToday", "jobs_today", "todayAppointments", "today_appointments", "appointmentsCount", "appointments_count"]),
  );
  const totalSlots =
    toSafeNumber(
      firstValue(entry, ["totalSlots", "total_slots", "dailyCapacity", "daily_capacity", "slotsTotal", "slots_total"]),
    ) || DEFAULT_DAILY_JOB_CAPACITY;
  const slotsRemaining =
    toSafeNumber(firstValue(entry, ["slotsRemaining", "slots_remaining", "remainingSlots", "remaining_slots"])) ||
    Math.max(0, totalSlots - jobsToday);
  const avatarTone = getAvatarTone(staffId);

  return {
    avatarBg: avatarTone.background,
    avatarColor: avatarTone.color,
    checkInTime,
    checkOutTime,
    employeeId,
    hoursWorked,
    id,
    initials: getInitials(staffName),
    jobsToday,
    rawStatus,
    slotsRemaining,
    staffId,
    staffName,
    staffRefId,
    statusKey: toAttendanceStatusKey(rawStatus),
    totalSlots,
    updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
    userId,
  };
};

const normalizeAttendanceSummary = (entry: UnknownRecord): AttendanceSummary => ({
  absent: toSafeNumber(firstValue(entry, ["absent"])),
  date: toSafeString(firstValue(entry, ["date"])) || null,
  late: toSafeNumber(firstValue(entry, ["late"])),
  onLeave: toSafeNumber(firstValue(entry, ["onLeave", "on_leave"])),
  present: toSafeNumber(firstValue(entry, ["present"])),
  total: toSafeNumber(firstValue(entry, ["total", "totalStaff", "total_staff"])),
});

const getSettingsFromEnvelope = (payload: AttendanceSettingsEnvelope): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["settings", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeAttendanceSettings = (entry: UnknownRecord): AttendanceSettings => ({
  gracePeriodMinutes: toSafeNumber(firstValue(entry, ["gracePeriodMinutes", "grace_period_minutes", "grace_period"])),
  halfDayThresholdMinutes: toSafeNumber(
    firstValue(entry, [
      "halfDayThresholdMinutes",
      "half_day_threshold_minutes",
      "half_day_threshold",
    ]),
  ),
  lateThresholdMinutes: toSafeNumber(
    firstValue(entry, ["lateThresholdMinutes", "late_threshold_minutes", "late_threshold"]),
  ),
  updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
  workEndTime: toSafeString(firstValue(entry, ["workEndTime", "work_end_time"])) || null,
  workStartTime: toSafeString(firstValue(entry, ["workStartTime", "work_start_time"])) || null,
});

export const attendanceService = {
  async checkIn(staffId: string): Promise<CheckInResponse> {
    const response = await api.post<AttendanceRecordApiResponse>(ATTENDANCE.CHECK_IN, {
      staff_id: staffId,
      staffId,
    });
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async checkOut(staffId: string): Promise<CheckOutResponse> {
    const response = await api.post<AttendanceRecordApiResponse>(ATTENDANCE.CHECK_OUT, {
      staff_id: staffId,
      staffId,
    });
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async getSummary(salonId?: string | null): Promise<AttendanceSummary> {
    const response = await api.get<AttendanceSummaryApiResponse>(ATTENDANCE.SUMMARY, {
      params: salonId ? { salon_id: salonId } : undefined,
    });

    return normalizeAttendanceSummary(getSummaryRecord(response.data.data));
  },

  async getToday(salonId?: string | null): Promise<AttendanceToday> {
    const response = await api.get<AttendanceTodayApiResponse>(ATTENDANCE.TODAY, {
      params: salonId ? { salon_id: salonId } : undefined,
    });
    const apiRecords = getTodayArray(response.data.data);
    const records = apiRecords
      .map(normalizeAttendanceRecord)
      .filter((record): record is AttendanceRecord => record !== null);

    return {
      date: getTodayDate(response.data.data),
      records,
    };
  },

  async markAttendance(payload: MarkAttendanceRequest): Promise<MarkAttendanceResponse> {
    // Backend contract (POST /attendance/mark, ManualMarkBody): staff_id,
    // date, and status are all required, or the API rejects with 400
    // VALIDATION_ERROR; check_in/check_out/note are optional. Field names
    // are snake_case singular ("note", not "notes") — sending the wrong key
    // silently drops the value instead of erroring.
    if (__DEV__ && !payload.date) {
      console.warn("[Attendance] markAttendance called without a date — backend requires it", payload);
    }

    const requestBody: Record<string, string> = {
      staff_id: payload.staffId,
      status: toManualStatusWireValue(payload.status),
    };

    if (payload.date !== undefined) {
      requestBody.date = payload.date;
    }

    if (payload.notes !== undefined) {
      requestBody.note = payload.notes;
    }

    const response = await api.post<AttendanceRecordApiResponse>(ATTENDANCE.MARK, requestBody);
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async updateAttendance(
    attendanceId: string,
    updates: UpdateAttendanceRequest,
  ): Promise<UpdateAttendanceResponse> {
    // Backend contract (PATCH /attendance/:id, UpdateAttendanceBody): only
    // status/check_in/check_out/note are recognized. The repository builds
    // the SQL SET clause directly from the request body's keys, so any other
    // key (e.g. the camelCase checkInTime/notes this used to send) becomes
    // an invalid column name and the query fails with a 500 — the fix is
    // sending exactly the backend's snake_case field names, nothing extra.
    const requestBody: Record<string, string> = {};

    if (updates.status !== undefined) {
      requestBody.status = toManualStatusWireValue(updates.status);
    }

    if (updates.checkInTime !== undefined) {
      requestBody.check_in = updates.checkInTime;
    }

    if (updates.checkOutTime !== undefined) {
      requestBody.check_out = updates.checkOutTime;
    }

    if (updates.notes !== undefined) {
      requestBody.note = updates.notes;
    }

    const url = ATTENDANCE.RECORD(attendanceId);

    if (__DEV__) {
      console.log("[Attendance] PATCH request", { attendanceId, body: requestBody, url });
    }

    const response = await api.patch<AttendanceRecordApiResponse>(url, requestBody);
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async updateSettings(
    updates: UpdateAttendanceSettingsRequest,
  ): Promise<UpdateAttendanceSettingsResponse> {
    const requestBody: Record<string, number | string> = {};

    if (updates.workStartTime !== undefined) {
      requestBody.workStartTime = updates.workStartTime;
      requestBody.work_start_time = updates.workStartTime;
    }

    if (updates.workEndTime !== undefined) {
      requestBody.workEndTime = updates.workEndTime;
      requestBody.work_end_time = updates.workEndTime;
    }

    if (updates.gracePeriodMinutes !== undefined) {
      requestBody.gracePeriodMinutes = updates.gracePeriodMinutes;
      requestBody.grace_period_minutes = updates.gracePeriodMinutes;
    }

    if (updates.halfDayThresholdMinutes !== undefined) {
      requestBody.halfDayThresholdMinutes = updates.halfDayThresholdMinutes;
      requestBody.half_day_threshold_minutes = updates.halfDayThresholdMinutes;
    }

    if (updates.lateThresholdMinutes !== undefined) {
      requestBody.lateThresholdMinutes = updates.lateThresholdMinutes;
      requestBody.late_threshold_minutes = updates.lateThresholdMinutes;
    }

    const response = await api.put<AttendanceSettingsApiResponse>(ATTENDANCE.SETTINGS, requestBody);

    return {
      message: response.data.message,
      settings: normalizeAttendanceSettings(getSettingsFromEnvelope(response.data.data)),
    };
  },
};
