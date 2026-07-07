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
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      schedule?: UnknownRecord | null;
    };
type ScheduleApiResponse = ApiResponse<ScheduleApiData>;
type DeleteScheduleApiResponse = ApiResponse<unknown>;

const getScheduleFromEnvelope = (payload: ScheduleApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["schedule", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeDayEntry = (entry: UnknownRecord, day: string): ScheduleDayEntry => ({
  day,
  endTime: toSafeString(firstValue(entry, ["endTime", "end_time"])) || null,
  isOff: toOptionalBoolean(firstValue(entry, ["isOff", "is_off"])),
  startTime: toSafeString(firstValue(entry, ["startTime", "start_time"])) || null,
});

const normalizeSchedule = (entry: UnknownRecord, staffId: string): StaffSchedule => {
  const apiDays = firstArray(entry, ["days", "schedule_days", "scheduleDays"]);
  const daysByName = new Map<string, UnknownRecord>();

  apiDays.forEach((dayEntry) => {
    const dayName = toSafeString(firstValue(dayEntry, ["day", "day_of_week", "dayOfWeek"])).toLowerCase();

    if (dayName) {
      daysByName.set(dayName, dayEntry);
    }
  });

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

    return normalizeSchedule(getScheduleFromEnvelope(response.data.data), staffId);
  },

  async updateSchedule(
    staffId: string,
    payload: UpdateScheduleRequest,
  ): Promise<UpdateScheduleResponse> {
    const response = await api.put<ScheduleApiResponse>(STAFF.SCHEDULED(staffId), payload);

    return {
      message: response.data.message,
      schedule: normalizeSchedule(getScheduleFromEnvelope(response.data.data), staffId),
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
