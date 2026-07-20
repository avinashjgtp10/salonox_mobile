import { ApiError, API_BASE_URL, api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { StaffAvailability, StaffAvailabilitySlot } from "@/types/staffAvailability";
import {
  asRecord,
  firstArray,
  firstValue,
  toOptionalBoolean,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type StaffAvailabilityApiData =
  | UnknownRecord
  | {
      availability?: UnknownRecord | null;
      data?: UnknownRecord | null;
      staffAvailability?: UnknownRecord | null;
    };

type StaffAvailabilityApiResponse = ApiResponse<StaffAvailabilityApiData>;

const toLooseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "available", "open", "working"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "busy", "closed", "off", "leave", "holiday"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const toTimeValue = (value: unknown): string | null => {
  const raw = toSafeString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime()) && raw.includes("T")) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const match = raw.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return raw;
  }

  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
};

const toDisplayTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hours24 = Number(match[1]);
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${match[2]} ${suffix}`;
};

const splitWorkingHours = (value: unknown) => {
  const workingHours = toSafeString(value).replace(/\u2013|\u2014/g, "-");
  const [startTime, endTime] = workingHours
    .split(/\s+(?:to|until)\s+|-/i)
    .map((part) => toTimeValue(part.trim()));

  return { endTime: endTime ?? null, startTime: startTime ?? null };
};

const getAvailabilityFromEnvelope = (payload: StaffAvailabilityApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["availability", "staffAvailability", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeSlot = (value: unknown, index: number): StaffAvailabilitySlot | null => {
  const entry = asRecord(value);
  const startTime =
    toTimeValue(
      typeof value === "string" || typeof value === "number"
        ? value
        : firstValue(entry, [
            "startTime",
            "start_time",
            "start",
            "slotStart",
            "slot_start",
            "time",
            "value",
            "scheduled_at",
          ]),
    ) ?? null;

  if (!startTime) {
    return null;
  }

  const endTime =
    toTimeValue(
      firstValue(entry, [
        "endTime",
        "end_time",
        "end",
        "slotEnd",
        "slot_end",
      ]),
    ) ?? null;
  const display =
    toSafeString(firstValue(entry, ["display", "label", "title"])) ||
    toDisplayTime(startTime) ||
    `Slot ${index + 1}`;

  return {
    display,
    endTime,
    value: startTime,
  };
};

const normalizeSlots = (entry: UnknownRecord) => {
  const rawSlots = firstValue(entry, [
    "availableSlots",
    "available_slots",
    "slots",
    "timeSlots",
    "time_slots",
  ]);
  const slots = Array.isArray(rawSlots) ? rawSlots : firstArray(entry, [
    "availableSlots",
    "available_slots",
    "slots",
    "timeSlots",
    "time_slots",
  ]);

  return slots
    .map(normalizeSlot)
    .filter((slot): slot is StaffAvailabilitySlot => Boolean(slot));
};

const getStatusLabel = (value: unknown) => {
  const label = toSafeString(value);
  return label || null;
};

const normalizeAvailability = (entry: UnknownRecord, staffId: string): StaffAvailability => {
  const workingHours = splitWorkingHours(firstValue(entry, ["workingHours", "working_hours", "hours"]));
  const shiftStartTime =
    toTimeValue(
      firstValue(entry, [
        "shiftStart",
        "shift_start",
        "startTime",
        "start_time",
        "work_start_time",
        "working_start_time",
      ]),
    ) ?? workingHours.startTime;
  const shiftEndTime =
    toTimeValue(
      firstValue(entry, [
        "shiftEnd",
        "shift_end",
        "endTime",
        "end_time",
        "work_end_time",
        "working_end_time",
      ]),
    ) ?? workingHours.endTime;
  const availableSlots = normalizeSlots(entry);
  const isOnLeave =
    toLooseBoolean(firstValue(entry, ["isOnLeave", "is_on_leave", "onLeave", "on_leave"])) ??
    Boolean(toSafeString(firstValue(entry, ["leaveStatus", "leave_status"])));
  const isHoliday =
    toLooseBoolean(firstValue(entry, ["isHoliday", "is_holiday", "holiday"])) ??
    toOptionalBoolean(firstValue(entry, ["holiday"]));
  const isAvailable =
    toLooseBoolean(firstValue(entry, ["isAvailable", "is_available", "available"])) ??
    (!isOnLeave && !isHoliday && availableSlots.length > 0);
  const shiftStartLabel = getStatusLabel(firstValue(entry, ["shiftStartLabel", "shift_start_label"])) ?? toDisplayTime(shiftStartTime);
  const shiftEndLabel = getStatusLabel(firstValue(entry, ["shiftEndLabel", "shift_end_label"])) ?? toDisplayTime(shiftEndTime);
  const workingHoursLabel =
    getStatusLabel(firstValue(entry, ["workingHoursLabel", "working_hours_label", "workingHours", "working_hours"])) ??
    (shiftStartLabel && shiftEndLabel ? `${shiftStartLabel} - ${shiftEndLabel}` : null);
  const leaveStatus = getStatusLabel(firstValue(entry, ["leaveStatus", "leave_status"]));

  return {
    availableSlots,
    availabilityLabel:
      getStatusLabel(firstValue(entry, ["availabilityLabel", "availability_label", "availabilityStatus", "availability_status"])) ??
      (isAvailable ? "Available" : "Busy"),
    blockedTimes: firstArray(entry, ["blockedTimes", "blocked_times", "blocks"]),
    checkedInLabel: getStatusLabel(firstValue(entry, ["checkedInLabel", "checked_in_label", "checkedIn", "checked_in"])),
    checkedOutLabel: getStatusLabel(firstValue(entry, ["checkedOutLabel", "checked_out_label", "checkedOut", "checked_out"])),
    currentStatusLabel:
      getStatusLabel(firstValue(entry, ["currentStatus", "current_status", "status", "statusLabel", "status_label"])) ??
      (isOnLeave ? "On Leave" : isHoliday ? "Holiday" : isAvailable ? "Available" : "Busy"),
    existingAppointments: firstArray(entry, ["existingAppointments", "existing_appointments", "appointments"]),
    holidayLabel:
      getStatusLabel(firstValue(entry, ["holidayLabel", "holiday_label"])) ??
      (isHoliday ? "Holiday" : null),
    isAvailable,
    isHoliday,
    isOnLeave,
    leaveStatus,
    onLeaveLabel:
      getStatusLabel(firstValue(entry, ["onLeaveLabel", "on_leave_label"])) ??
      (isOnLeave ? leaveStatus ?? "On Leave" : null),
    raw: entry,
    shiftEndLabel,
    shiftEndTime,
    shiftStartLabel,
    shiftStartTime,
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    workingHoursLabel,
  };
};

export const staffAvailabilityService = {
  async getAvailability(staffId: string, date: string): Promise<StaffAvailability> {
    const url = STAFF.AVAILABILITY(staffId);
    const params = { date };
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${API_BASE_URL}${url}${queryString ? `?${queryString}` : ""}`;

    if (__DEV__) {
      console.log("[StaffAvailability API] Request", {
        fullUrl,
        method: "GET",
        params,
        staffId,
        url,
      });
    }

    try {
      const response = await api.get<StaffAvailabilityApiResponse>(url, { params });

      if (__DEV__) {
        console.log("[StaffAvailability API] Response", {
          body: response.data,
          fullUrl,
          status: response.status,
        });
      }

      return normalizeAvailability(getAvailabilityFromEnvelope(response.data.data), staffId);
    } catch (error) {
      if (__DEV__) {
        console.log("[StaffAvailability API] Error response", {
          body: error instanceof ApiError ? error.responseData : undefined,
          fullUrl,
          message: error instanceof Error ? error.message : String(error),
          status: error instanceof ApiError ? error.status : undefined,
        });
      }

      throw error;
    }
  },
};
