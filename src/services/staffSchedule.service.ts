import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  DeleteScheduleResponse,
  ScheduleDayEntry,
  StaffSchedule,
  UpdateScheduleRequest,
  UpdateScheduleResponse,
} from "@/types/staffSchedule";
import {
  asRecord,
  firstArray,
  firstValue,
  toOptionalBoolean,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

type ScheduleApiData =
  | UnknownRecord[]
  | UnknownRecord
  | {
      data?: UnknownRecord | UnknownRecord[] | null;
      schedule?: UnknownRecord | UnknownRecord[] | null;
      scheduled?: UnknownRecord | UnknownRecord[] | null;
      staffSchedule?: UnknownRecord | UnknownRecord[] | null;
    };
type ScheduleApiResponse = ApiResponse<ScheduleApiData>;
type DeleteScheduleApiResponse = ApiResponse<unknown>;

const getScheduleFromEnvelope = (payload: ScheduleApiData): UnknownRecord => {
  if (Array.isArray(payload)) {
    return { days: payload.map(asRecord) };
  }

  const record = asRecord(payload);
  const nested = firstValue(record, ["schedule", "staffSchedule", "scheduled", "data"]);

  if (Array.isArray(nested)) {
    return { ...record, days: nested.map(asRecord) };
  }

  return nested !== undefined ? asRecord(nested) : record;
};

const toLooseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "y", "open", "active", "working"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "n", "closed", "off", "inactive", "holiday"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const splitWorkingHours = (value: unknown) => {
  const workingHours = toSafeString(value).replace(/\u2013|\u2014/g, "-");
  const [startTime, endTime] = workingHours
    .split(/\s+(?:to|until)\s+|-/i)
    .map((part) => part.trim());

  return { endTime: endTime || null, startTime: startTime || null };
};

const normalizeDayName = (value: unknown) => {
  const rawValue = toSafeString(value).toLowerCase();

  if (!rawValue) {
    return "";
  }

  const numericDay = Number(rawValue);

  if (Number.isInteger(numericDay)) {
    if (numericDay === 0) {
      return "sunday";
    }

    if (numericDay >= 1 && numericDay <= WEEK_DAYS.length) {
      return WEEK_DAYS[numericDay - 1];
    }
  }

  return rawValue;
};

const normalizeDayEntry = (entry: UnknownRecord, day: string): ScheduleDayEntry => ({
  day,
  endTime:
    toSafeString(
      firstValue(entry, [
        "endTime",
        "end_time",
        "work_end_time",
        "working_end_time",
        "shiftEnd",
        "shift_end",
        "toTime",
        "to_time",
        "end",
        "close_time",
        "closing_time",
      ]),
    ) ||
    splitWorkingHours(firstValue(entry, ["workingHours", "working_hours", "hours"])).endTime ||
    null,
  isOff:
    toLooseBoolean(firstValue(entry, ["isAvailable", "is_available", "available"])) === false ||
    ((toLooseBoolean(
        firstValue(entry, [
          "isOff",
          "is_off",
          "isClosed",
          "is_closed",
          "closed",
          "isHoliday",
          "is_holiday",
          "holiday",
          "isDayOff",
          "is_day_off",
          "day_off",
        ]),
      ) ??
        toOptionalBoolean(
          firstValue(entry, [
            "isOff",
            "is_off",
            "isClosed",
            "is_closed",
            "closed",
            "isHoliday",
            "is_holiday",
            "holiday",
            "isDayOff",
            "is_day_off",
            "day_off",
          ]),
        )) ||
      toLooseBoolean(firstValue(entry, ["isWorking", "is_working", "working", "isOpen", "is_open"])) === false),
  startTime:
    toSafeString(
      firstValue(entry, [
        "startTime",
        "start_time",
        "work_start_time",
        "working_start_time",
        "shiftStart",
        "shift_start",
        "fromTime",
        "from_time",
        "start",
        "open_time",
        "opening_time",
      ]),
    ) ||
    splitWorkingHours(firstValue(entry, ["workingHours", "working_hours", "hours"])).startTime ||
    null,
});

const normalizeSchedule = (entry: UnknownRecord, staffId: string): StaffSchedule => {
  const apiDays = firstArray(entry, ["days", "schedule_days", "scheduleDays"]);
  const daysByName = new Map<string, UnknownRecord>();

  apiDays.forEach((dayEntry) => {
    const dayName = normalizeDayName(
      firstValue(dayEntry, ["day", "dayName", "day_name", "day_of_week", "dayOfWeek", "weekday", "week_day"]),
    );

    if (dayName) {
      daysByName.set(dayName, dayEntry);
    }
  });

  if (apiDays.length === 0) {
    WEEK_DAYS.forEach((day) => {
      const directDay = asRecord(firstValue(entry, [day, day.slice(0, 3)]));
      const globalWorkingHours = splitWorkingHours(firstValue(entry, ["workingHours", "working_hours", "hours"]));
      const startTime =
        toSafeString(
          firstValue(entry, [
            `${day}_start_time`,
            `${day}StartTime`,
            `${day.slice(0, 3)}_start_time`,
            "work_start_time",
            "shift_start",
            "shiftStart",
            "start_time",
            "startTime",
          ]),
        ) || globalWorkingHours.startTime;
      const endTime =
        toSafeString(
          firstValue(entry, [
            `${day}_end_time`,
            `${day}EndTime`,
            `${day.slice(0, 3)}_end_time`,
            "work_end_time",
            "shift_end",
            "shiftEnd",
            "end_time",
            "endTime",
          ]),
        ) || globalWorkingHours.endTime;

      if (Object.keys(directDay).length > 0) {
        daysByName.set(day, directDay);
        return;
      }

      if (startTime || endTime) {
        daysByName.set(day, {
          day,
          end_time: endTime,
          start_time: startTime,
        });
      }
    });
  }

  const days = WEEK_DAYS.map((day) => normalizeDayEntry(daysByName.get(day) ?? {}, day));

  return {
    days,
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
  };
};

export const staffScheduleService = {
  async getSchedule(staffId: string): Promise<StaffSchedule> {
    const response = await api.get<ScheduleApiResponse>(STAFF.SCHEDULED(staffId));
    const rawEnvelope = response.data;
    const scheduleEnvelope = getScheduleFromEnvelope(response.data.data);
    const schedule = normalizeSchedule(scheduleEnvelope, staffId);

    if (__DEV__) {
      console.log("[StaffSchedule] Raw API response", {
        response: rawEnvelope,
        staffId,
        url: STAFF.SCHEDULED(staffId),
      });
      console.log("[StaffSchedule] Parsed schedule", {
        parsed: schedule,
        staffId,
      });
    }

    return schedule;
  },

  async updateSchedule(
    staffId: string,
    payload: UpdateScheduleRequest,
  ): Promise<UpdateScheduleResponse> {
    const response = await api.put<ScheduleApiResponse>(STAFF.SCHEDULED(staffId), payload);
    const scheduleEnvelope = getScheduleFromEnvelope(response.data.data);
    const schedule = normalizeSchedule(scheduleEnvelope, staffId);

    if (__DEV__) {
      console.log("[StaffSchedule] Raw update response", {
        response: response.data,
        staffId,
        url: STAFF.SCHEDULED(staffId),
      });
      console.log("[StaffSchedule] Parsed update schedule", {
        parsed: schedule,
        staffId,
      });
    }

    return {
      message: response.data.message,
      schedule,
    };
  },

  async deleteSchedule(staffId: string): Promise<DeleteScheduleResponse> {
    const response = await api.delete<DeleteScheduleApiResponse>(STAFF.SCHEDULED(staffId));

    return {
      message: response.data.message,
      staffId,
    };
  },
};
