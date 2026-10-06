import { api } from "@/services/api";
import { attendanceDateKey, evaluateAttendanceCheckIn } from "@/features/attendance/utils/attendanceRules";
import { parseAttendanceDateTime } from "@/features/attendance/utils/attendanceStatus";
import { ATTENDANCE, STAFF } from "@/services/api/endpoints";
import type {
  AttendanceRecord,
  AttendanceRecordList,
  AttendanceSettings,
  AttendanceStatusKey,
  AttendanceSummary,
  AttendanceToday,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  ManualAttendanceStatus,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  UpdateAttendanceRequest,
  UpdateAttendanceResponse,
  UpdateAttendanceSettingsRequest,
  UpdateAttendanceSettingsResponse,
} from "@/types/attendance";
import type { ApiResponse } from "@/types/auth";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

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

const toAttendanceStatusKey = (rawStatus: string): AttendanceStatusKey => {
  const normalized = rawStatus.toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "present":
      return "present";
    case "late":
      return "late";
    case "half_day":
    case "halfday":
      return "halfDay";
    case "absent":
      return "absent";
    case "on_leave":
      return "onLeave";
    case "not_marked":
    case "notmarked":
      return "notMarked";
    default:
      return "notMarked";
  }
};

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
      summary?: UnknownRecord | null;
      items?: AttendanceRecordApiItem[] | null;
      records?: AttendanceRecordApiItem[] | null;
      rows?: AttendanceRecordApiItem[] | null;
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
type AttendanceListApiData =
  | AttendanceRecordApiItem[]
  | {
      attendance?: AttendanceRecordApiItem[] | null;
      data?: AttendanceRecordApiItem[] | null;
      items?: AttendanceRecordApiItem[] | null;
      pagination?: UnknownRecord | null;
      records?: AttendanceRecordApiItem[] | null;
      rows?: AttendanceRecordApiItem[] | null;
      staff?: AttendanceRecordApiItem[] | null;
      total?: number | string | null;
      total_count?: number | string | null;
    };
type AttendanceListApiResponse = ApiResponse<AttendanceListApiData>;

const getTodayArray = (payload: AttendanceTodayApiData) => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["staff", "records", "attendance", "items", "rows", "data"]);
};

const getAttendanceListArray = (payload: AttendanceListApiData) => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["items", "records", "attendance", "rows", "staff", "data"]);
};

const getAttendanceListTotal = (payload: AttendanceListApiData, fallback: number) => {
  if (Array.isArray(payload)) {
    return fallback;
  }

  const record = asRecord(payload);
  const pagination = asRecord(payload.pagination);

  return (
    toSafeNumber(firstValue(record, ["total", "total_count", "totalCount"])) ||
    toSafeNumber(firstValue(pagination, ["total", "total_count", "totalCount"])) ||
    fallback
  );
};

const getTodayDate = (payload: AttendanceTodayApiData) =>
  Array.isArray(payload) ? null : toSafeString(payload.date) || toSafeString(asRecord(payload.summary).date) || null;

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

export const normalizeAttendanceRecord = (entry: UnknownRecord): AttendanceRecord | null => {
  const recordId = toSafeString(firstValue(entry, ["id", "_id", "attendanceId", "attendance_id"]));

  const nestedStaff = asRecord(firstValue(entry, ["staff", "employee", "staffMember", "staff_member"]));
  const staffRefId = toSafeString(firstValue(nestedStaff, ["id", "_id", "staffId", "staff_id", "uuid"])) || null;
  const userId = toSafeString(firstValue(entry, ["userId", "user_id"])) || null;
  const employeeId = toSafeString(firstValue(entry, ["employeeId", "employee_id", "employeeCode", "employee_code"])) || null;

  const explicitStaffId = toSafeString(firstValue(entry, ["staffId", "staff_id"]));
  const staffId = explicitStaffId || staffRefId || userId || employeeId || recordId;

  if (!staffId) {
    return null;
  }

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
  const start = parseAttendanceDateTime(checkInTime), end = parseAttendanceDateTime(checkOutTime);
  const hoursWorked = start && end && end.getTime() >= start.getTime()
    ? Number(((end.getTime() - start.getTime()) / 3600000).toFixed(2))
    : hoursWorkedRaw != null ? toSafeNumber(hoursWorkedRaw) : null;
  const scheduledHoursRaw = firstValue(entry, ["scheduledHours", "scheduled_hours"]);
  const scheduledHours = scheduledHoursRaw !== undefined ? toSafeNumber(scheduledHoursRaw) : null;
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
    checkInLocation: toSafeString(firstValue(entry, ["checkInLocation", "check_in_location"])) || null,
    checkOutLocation: toSafeString(firstValue(entry, ["checkOutLocation", "check_out_location"])) || null,
    date: attendanceDateKey(
      toSafeString(
        firstValue(entry, ["date", "attendanceDate", "attendance_date", "markedDate", "marked_date"]),
      )),
    employeeId,
    hoursWorked,
    id,
    initials: getInitials(staffName),
    jobsToday,
    rawStatus,
    scheduledHours,
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
  halfDay: toSafeNumber(firstValue(entry, ["halfDay", "half_day"])),
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
  active: entry.active === true,
  thresholdHours: toSafeNumber(entry.threshold_hours ?? 2),
  minFullDayHours: toSafeNumber(entry.min_full_day_hours ?? 7),
  halfDayDeductionAmount: toSafeNumber(entry.half_day_deduction_amount),
  attendanceBonus: toSafeNumber(entry.attendance_bonus),
  commissionThresholdDays: toSafeNumber(entry.commission_threshold_days),
  staffScope: entry.staff_scope === "selected" ? "selected" : "all",
  selectedStaffIds: Array.isArray(entry.selected_staff_ids) ? entry.selected_staff_ids.map(String) : [],
  gracePeriodMinutes: toSafeNumber(firstValue(entry, ["grace_minutes", "gracePeriodMinutes", "grace_period_minutes", "grace_period"])),
  halfDayThresholdMinutes: entry.min_half_day_hours !== undefined ? toSafeNumber(entry.min_half_day_hours) * 60 : toSafeNumber(
    firstValue(entry, [
      "halfDayThresholdMinutes",
      "half_day_threshold_minutes",
      "half_day_threshold",
    ]),
  ),
  lateThresholdMinutes: toSafeNumber(
    firstValue(entry, ["grace_minutes", "lateThresholdMinutes", "late_threshold_minutes", "late_threshold"]),
  ),
  updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
  workEndTime: toSafeString(firstValue(entry, ["shift_end", "workEndTime", "work_end_time"])) || null,
  workStartTime: toSafeString(firstValue(entry, ["shift_start", "workStartTime", "work_start_time"])) || null,
});

const appendCoordinates = (
  requestBody: Record<string, number | string>,
  payload: unknown,
) => {
  const coordinates = asRecord(payload);
  const latitude = coordinates.latitude;
  const longitude = coordinates.longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return;
  }

  requestBody.latitude = latitude;
  requestBody.longitude = longitude;
  requestBody.lat = latitude;
  requestBody.lng = longitude;
};

export const attendanceService = {
  async getSettings(): Promise<AttendanceSettings> {
    const response = await api.get<AttendanceSettingsApiResponse>(ATTENDANCE.SETTINGS);
    return normalizeAttendanceSettings(getSettingsFromEnvelope(response.data.data));
  },
  async exportCSV(year: number, month: number): Promise<string> {
    const response = await api.get<string>(ATTENDANCE.EXPORT, { params: { year, month }, responseType: "text" });
    return response.data;
  },
  async checkIn(payload: CheckInRequest): Promise<CheckInResponse> {
    const timestamp = payload.checkInTime ?? new Date().toISOString();
    const [settings, schedule] = await Promise.all([
      attendanceService.getSettings(), api.get<ApiResponse<UnknownRecord[]>>(STAFF.SCHEDULED(payload.staffId)),
    ]);
    const shifts = schedule.data.data.map(item => ({
      date: toSafeString(item.date) || null, dayOfWeek: toSafeNumber(item.day_of_week),
      isAvailable: item.is_available === true, startTime: toSafeString(item.start_time) || null,
    }));
    const requestBody: Record<string, number | string> = {
      staff_id: payload.staffId,
      check_in: timestamp,
      status: toManualStatusWireValue(evaluateAttendanceCheckIn(settings, shifts, payload.staffId, timestamp)),
    };

    if (payload.checkInTime !== undefined) {
      requestBody.check_in = payload.checkInTime;
    }

    if (payload.notes !== undefined) {
      requestBody.note = payload.notes;
    }

    appendCoordinates(requestBody, payload);

    if (payload.location?.trim()) {
      requestBody.location = payload.location.trim();
    }

    const response = await api.post<AttendanceRecordApiResponse>(ATTENDANCE.CHECK_IN, requestBody);
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async checkOut(payload: CheckOutRequest): Promise<CheckOutResponse> {
    const requestBody: Record<string, number | string> = {
      staff_id: payload.staffId,
      staffId: payload.staffId,
    };

    if (payload.checkOutTime !== undefined) {
      requestBody.check_out = payload.checkOutTime;
    }

    if (payload.notes !== undefined) {
      requestBody.note = payload.notes;
    }

    appendCoordinates(requestBody, payload);

    if (payload.location?.trim()) {
      requestBody.location = payload.location.trim();
    }

    const response = await api.post<AttendanceRecordApiResponse>(ATTENDANCE.CHECK_OUT, requestBody);
    const record = normalizeAttendanceRecord(getRecordFromEnvelope(response.data.data));

    return {
      message: response.data.message,
      record,
    };
  },

  async getSummary(salonId?: string | null, date?: string): Promise<AttendanceSummary> {
    const response = await api.get<AttendanceSummaryApiResponse>(ATTENDANCE.SUMMARY, {
      params: {
        ...(salonId ? { salon_id: salonId } : {}),
        ...(date ? { date } : {}),
      },
    });

    return normalizeAttendanceSummary(getSummaryRecord(response.data.data));
  },

  async getToday(salonId?: string | null, date?: string): Promise<AttendanceToday> {
    const response = await api.get<AttendanceTodayApiResponse>(ATTENDANCE.TODAY, {
      params: {
        ...(salonId ? { salon_id: salonId } : {}),
        ...(date ? { date } : {}),
      },
    });
    const apiRecords = getTodayArray(response.data.data);
    const records = apiRecords
      .map(normalizeAttendanceRecord)
      .filter((record): record is AttendanceRecord => record !== null);

    return {
      date: getTodayDate(response.data.data),
      records,
      summary: Array.isArray(response.data.data)
        ? null
        : normalizeAttendanceSummary(getSummaryRecord(asRecord(response.data.data))),
    };
  },

  async getMonthly(year: number, month: number, salonId?: string | null): Promise<AttendanceRecordList> {
    const response = await api.get<AttendanceListApiResponse>(ATTENDANCE.MONTHLY, {
      params: {
        month,
        ...(salonId ? { salon_id: salonId } : {}),
        year,
      },
    });
    const apiRecords = getAttendanceListArray(response.data.data);
    const records = apiRecords
      .map(normalizeAttendanceRecord)
      .filter((record): record is AttendanceRecord => record !== null);

    return {
      records,
      total: getAttendanceListTotal(response.data.data, records.length),
    };
  },

  async getRange(
    startDate: string,
    endDate: string,
    salonId?: string | null,
  ): Promise<AttendanceRecordList> {
    const response = await api.get<AttendanceListApiResponse>(ATTENDANCE.RANGE, {
      params: {
        end_date: endDate,
        ...(salonId ? { salon_id: salonId } : {}),
        start_date: startDate,
      },
    });
    const apiRecords = getAttendanceListArray(response.data.data);
    const records = apiRecords
      .map(normalizeAttendanceRecord)
      .filter((record): record is AttendanceRecord => record !== null);

    return {
      records,
      total: getAttendanceListTotal(response.data.data, records.length),
    };
  },

  async getForStaff(
    staffId: string,
    options: {
      endDate?: string;
      limit?: number;
      page?: number;
      salonId?: string | null;
      startDate?: string;
    } = {},
  ): Promise<AttendanceRecordList> {
    const response = await api.get<AttendanceListApiResponse>(ATTENDANCE.STAFF(staffId), {
      params: {
        ...(options.endDate ? { end_date: options.endDate } : {}),
        ...(options.limit ? { limit: options.limit } : {}),
        ...(options.page ? { page: options.page } : {}),
        ...(options.salonId ? { salon_id: options.salonId } : {}),
        ...(options.startDate ? { start_date: options.startDate } : {}),
      },
    });
    const apiRecords = getAttendanceListArray(response.data.data);
    const records = apiRecords
      .map(normalizeAttendanceRecord)
      .filter((record): record is AttendanceRecord => record !== null);

    return {
      records,
      total: getAttendanceListTotal(response.data.data, records.length),
    };
  },

  async markAttendance(payload: MarkAttendanceRequest): Promise<MarkAttendanceResponse> {
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
    const requestBody: Record<string, number | string | boolean | string[]> = {};

    if (updates.workStartTime !== undefined) {
      requestBody.shift_start = updates.workStartTime;
    }

    if (updates.workEndTime !== undefined) {
      requestBody.shift_end = updates.workEndTime;
    }

    if (updates.gracePeriodMinutes !== undefined) {
      requestBody.grace_minutes = updates.gracePeriodMinutes;
    }

    if (updates.halfDayThresholdMinutes !== undefined) {
      requestBody.min_half_day_hours = updates.halfDayThresholdMinutes / 60;
    }

    if (updates.lateThresholdMinutes !== undefined) {
      if (updates.gracePeriodMinutes === undefined) requestBody.grace_minutes = updates.lateThresholdMinutes;
    }

    const fields = { active: "active", thresholdHours: "threshold_hours", minFullDayHours: "min_full_day_hours", halfDayDeductionAmount: "half_day_deduction_amount", attendanceBonus: "attendance_bonus", commissionThresholdDays: "commission_threshold_days", staffScope: "staff_scope", selectedStaffIds: "selected_staff_ids" } as const;
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      if (updates[key] !== undefined) requestBody[fields[key]] = updates[key]!;
    }
    const response = await api.put<AttendanceSettingsApiResponse>(ATTENDANCE.SETTINGS, requestBody);

    return {
      message: response.data.message,
      settings: normalizeAttendanceSettings(getSettingsFromEnvelope(response.data.data)),
    };
  },
};
