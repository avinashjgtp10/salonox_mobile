import type { StaffAvailabilitySlot } from "@/types/staffAvailability";
import { formatAppTime } from "@/utils/dateTime";
import { isValidIsoDate } from "@/utils/validation";

const DEFAULT_TIME_SLOT_START_MINUTES = 0;
const DEFAULT_TIME_SLOT_END_MINUTES = 24 * 60;
const DEFAULT_TIME_SLOT_INTERVAL_MINUTES = 30;

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const toStrictIsoDateTime = (value: string) => {
  let normalized = value.trim();

  if (normalized.includes(" ") && !normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
  }

  normalized = normalized.replace(/(T\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})$/, "$1$2:00");

  if (normalized.includes("T") && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += "Z";
  }

  return normalized;
};

export const parseAppointmentDateTime = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(toStrictIsoDateTime(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatTimeLabel = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);
  return parsedDate ? formatAppTime(parsedDate, "--:--") : "--:--";
};

export const getDateKey = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);

  if (!parsedDate) {
    return value ? value.slice(0, 10) : "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const toInputDate = (value: string | null) => getDateKey(value) || todayIsoDate();

export const toInputTime = (value: string | null) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value.slice(0, 5);
  }

  return `${String(parsedDate.getHours()).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`;
};

export const combineDateTime = (date: string, time: string) => {
  if (!date || !time) {
    return "";
  }

  return new Date(`${date}T${time}:00`).toISOString();
};

export const addMinutesToTime = (date: string, startTime: string, minutes: number) => {
  if (!date || !startTime || !Number.isFinite(minutes)) {
    return "";
  }

  const parsedDate = new Date(`${date}T${startTime}:00`);
  parsedDate.setMinutes(parsedDate.getMinutes() + minutes);

  return `${String(parsedDate.getHours()).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`;
};

export const parseClockToMinutes = (value?: string | null) => {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2]);
    const ampm = twelveHour[3].toUpperCase();

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }

    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const twentyFourHour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return twentyFourHour ? Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]) : null;
};

export const minutesToDisplayTime = (minutes: number) => {
  const hours24 = Math.floor(minutes / 60);
  const minuteLabel = String(minutes % 60).padStart(2, "0");
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minuteLabel} ${suffix}`;
};

export const minutesToClockTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const validateTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const validateDate = (value: string) => isValidIsoDate(value);

export const isPastDate = (value: string) => validateDate(value) && value < todayIsoDate();

export const getDefaultTimeSlots = (date: string): StaffAvailabilitySlot[] => {
  if (!validateDate(date)) {
    return [];
  }

  const now = new Date();
  const isToday = date === todayIsoDate();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const minimumMinutes = isToday
    ? Math.ceil(currentMinutes / DEFAULT_TIME_SLOT_INTERVAL_MINUTES) * DEFAULT_TIME_SLOT_INTERVAL_MINUTES
    : DEFAULT_TIME_SLOT_START_MINUTES;
  const startMinutes = Math.max(DEFAULT_TIME_SLOT_START_MINUTES, minimumMinutes);
  const slots: StaffAvailabilitySlot[] = [];

  for (
    let minutes = startMinutes;
    minutes < DEFAULT_TIME_SLOT_END_MINUTES;
    minutes += DEFAULT_TIME_SLOT_INTERVAL_MINUTES
  ) {
    const value = minutesToClockTime(minutes);

    slots.push({
      display: minutesToDisplayTime(minutes),
      endTime: minutesToClockTime(Math.min(minutes + DEFAULT_TIME_SLOT_INTERVAL_MINUTES, DEFAULT_TIME_SLOT_END_MINUTES)),
      value,
    });
  }

  return slots;
};
