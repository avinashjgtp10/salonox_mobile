import { staffBlockedTimesService } from "@/services/staffBlockedTimes.service";
import { staffScheduleService } from "@/services/staffSchedule.service";
import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";
import type { StaffAvailability, StaffAvailabilitySlot } from "@/types/staffAvailability";
import type { ScheduleDayEntry, StaffSchedule } from "@/types/staffSchedule";
import {
  type UnknownRecord,
} from "@/utils/apiNormalize";

const SLOT_INTERVAL_MINUTES = 30;
const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const toTimeValue = (value: unknown): string | null => {
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

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

const toMinutes = (time: string | null): number | null => {
  const normalized = toTimeValue(time);

  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const getScheduleDay = (schedule: StaffSchedule, date: string): ScheduleDayEntry | null => {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const day = WEEK_DAYS[parsedDate.getDay()];

  return schedule.days.find((entry) => entry.day.toLowerCase() === day) ?? null;
};

const getBlockMinutesForDate = (blockedTime: BlockedTimeEntry, date: string) => {
  const startDate = blockedTime.startAt ? new Date(blockedTime.startAt) : null;
  const endDate = blockedTime.endAt ? new Date(blockedTime.endAt) : null;

  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);

  if (endDate < dayStart || startDate > dayEnd) {
    return null;
  }

  const start = startDate < dayStart ? 0 : startDate.getHours() * 60 + startDate.getMinutes();
  const end = endDate > dayEnd ? 24 * 60 : endDate.getHours() * 60 + endDate.getMinutes();

  return { end, start };
};

const isBlocked = (slotStart: number, blockedTimes: BlockedTimeEntry[], date: string) =>
  blockedTimes.some((blockedTime) => {
    const block = getBlockMinutesForDate(blockedTime, date);

    return Boolean(block && slotStart >= block.start && slotStart < block.end);
  });

const buildSlots = (
  scheduleDay: ScheduleDayEntry | null,
  blockedTimes: BlockedTimeEntry[],
  date: string,
): StaffAvailabilitySlot[] => {
  if (!scheduleDay || scheduleDay.isOff) {
    return [];
  }

  const shiftStart = toMinutes(scheduleDay.startTime);
  const shiftEnd = toMinutes(scheduleDay.endTime);

  if (shiftStart === null || shiftEnd === null || shiftEnd <= shiftStart) {
    return [];
  }

  const slots: StaffAvailabilitySlot[] = [];

  for (let minutes = shiftStart; minutes < shiftEnd; minutes += SLOT_INTERVAL_MINUTES) {
    if (isBlocked(minutes, blockedTimes, date)) {
      continue;
    }

    const value = fromMinutes(minutes);

    slots.push({
      display: toDisplayTime(value) ?? value,
      endTime: fromMinutes(Math.min(minutes + SLOT_INTERVAL_MINUTES, shiftEnd)),
      value,
    });
  }

  return slots;
};

const normalizeAvailability = (
  schedule: StaffSchedule,
  blockedTimes: BlockedTimeEntry[],
  staffId: string,
  date: string,
): StaffAvailability => {
  const scheduleDay = getScheduleDay(schedule, date);
  const shiftStartTime = toTimeValue(scheduleDay?.startTime);
  const shiftEndTime = toTimeValue(scheduleDay?.endTime);
  const shiftStartLabel = toDisplayTime(shiftStartTime);
  const shiftEndLabel = toDisplayTime(shiftEndTime);
  const workingHoursLabel =
    shiftStartLabel && shiftEndLabel ? `${shiftStartLabel} - ${shiftEndLabel}` : null;
  const availableSlots = buildSlots(scheduleDay, blockedTimes, date);
  const isOff = !scheduleDay || scheduleDay.isOff;
  const isAvailable = !isOff && availableSlots.length > 0;

  return {
    availableSlots,
    availabilityLabel: isOff ? "Not scheduled" : isAvailable ? "Available" : "Busy",
    blockedTimes,
    checkedInLabel: null,
    checkedOutLabel: null,
    currentStatusLabel: isOff ? "Not scheduled" : isAvailable ? "Available" : "Busy",
    existingAppointments: [],
    holidayLabel: isOff ? "Not scheduled" : null,
    isAvailable,
    isHoliday: isOff,
    isOnLeave: false,
    leaveStatus: null,
    onLeaveLabel: null,
    raw: { blockedTimes, date, schedule } satisfies UnknownRecord,
    shiftEndLabel,
    shiftEndTime,
    shiftStartLabel,
    shiftStartTime,
    staffId,
    workingHoursLabel,
  };
};

export const staffAvailabilityService = {
  async getAvailability(staffId: string, date: string): Promise<StaffAvailability> {
    const [schedule, blockedTimes] = await Promise.all([
      staffScheduleService.getSchedule(staffId),
      staffBlockedTimesService.getBlockedTimes(staffId),
    ]);

    return normalizeAvailability(schedule, blockedTimes, staffId, date);
  },
};
