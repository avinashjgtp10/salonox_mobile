import type { ThemeColors } from "@/constants/theme";
import type {
  AttendanceActionKind,
  AttendanceRecord,
  AttendanceStatusKey,
  ManualAttendanceStatus,
} from "@/types/attendance";
import type { AttendanceErrorKind } from "@/middleware/attendance/attendance.thunk";

export type AttendanceStatusIconName =
  | "cafe"
  | "checkmark-circle"
  | "close-circle"
  | "contrast"
  | "ellipse-outline"
  | "moon"
  | "time";

export type AttendanceStatusConfig = {
  bg: string;
  color: string;
  icon: AttendanceStatusIconName;
  key: AttendanceStatusKey;
  label: string;
};

const buildAttendanceStatusConfig = (
  Colors: ThemeColors,
): Record<AttendanceStatusKey, AttendanceStatusConfig> => ({
  present: {
    bg: Colors.successBg,
    color: Colors.success,
    icon: "checkmark-circle",
    key: "present",
    label: "Present",
  },
  late: {
    bg: Colors.warningBg,
    color: Colors.warning,
    icon: "time",
    key: "late",
    label: "Late",
  },
  halfDay: {
    bg: Colors.infoBg,
    color: Colors.info,
    icon: "contrast",
    key: "halfDay",
    label: "Half Day",
  },
  absent: {
    bg: Colors.errorBg,
    color: Colors.error,
    icon: "close-circle",
    key: "absent",
    label: "Absent",
  },
  onLeave: {
    bg: Colors.purpleBg,
    color: Colors.purple,
    icon: "moon",
    key: "onLeave",
    label: "On Leave",
  },
  notMarked: {
    bg: Colors.bg2,
    color: Colors.text2,
    icon: "ellipse-outline",
    key: "notMarked",
    label: "Not Marked",
  },
});

const buildNotMarkedStatusConfig = (Colors: ThemeColors): Omit<AttendanceStatusConfig, "key"> => ({
  bg: Colors.bg2,
  color: Colors.text2,
  icon: "ellipse-outline",
  label: "Not Marked",
});

export const getAttendanceStatusConfig = (
  statusKey: AttendanceStatusKey,
  Colors: ThemeColors,
): AttendanceStatusConfig => buildAttendanceStatusConfig(Colors)[statusKey];

export const getAttendanceBadgeConfig = (
  record: AttendanceRecord | null | undefined,
  Colors: ThemeColors,
): AttendanceStatusConfig | Omit<AttendanceStatusConfig, "key"> =>
  // Only a live break overrides the day's status; everyone else keeps
  // Present/Late/Absent/Half Day/On Leave for the owner's views.
  record?.activity?.current_status === "ON_BREAK"
    ? { bg: Colors.warningBg, color: Colors.warning, icon: "cafe", label: "On Break" }
    : record ? getAttendanceStatusConfig(record.statusKey, Colors) : buildNotMarkedStatusConfig(Colors);

export type AttendanceAction = {
  kind: AttendanceActionKind;
  label: string;
};

export const getAttendanceAction = (record: AttendanceRecord | null | undefined): AttendanceAction => {
  if (!record || (!record.checkInTime && !record.checkOutTime)) {
    return { kind: "checkIn", label: "Check In" };
  }

  if (record.checkInTime && !record.checkOutTime) {
    return { kind: "checkOut", label: "Check Out" };
  }

  return { kind: "edit", label: "Edit" };
};

export const getAttendanceProgress = (record: AttendanceRecord) => {
  if (record.totalSlots <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((record.jobsToday / record.totalSlots) * 100));
};

export const MANUAL_STATUS_LABELS: Record<ManualAttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  halfDay: "Half Day",
  absent: "Absent",
  onLeave: "On Leave",
};

export const MANUAL_STATUS_OPTIONS: { label: string; value: ManualAttendanceStatus }[] = (
  ["present", "late", "halfDay", "absent", "onLeave"] as ManualAttendanceStatus[]
).map((value) => ({ label: MANUAL_STATUS_LABELS[value], value }));

export const statusKeyToManualStatus = (statusKey: AttendanceStatusKey): ManualAttendanceStatus => {
  switch (statusKey) {
    case "present":
    case "notMarked":
      return "present";
    case "late":
      return "late";
    case "halfDay":
      return "halfDay";
    case "onLeave":
      return "onLeave";
    case "absent":
    default:
      return "absent";
  }
};

const toStrictIsoDateTime = (value: string) => {
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

export const parseAttendanceDateTime = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [hours, minutes, seconds = "0"] = trimmed.split(":");
    if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return null;
    const anchored = new Date(`${getTodayAttendanceDateKey()}T${hours.padStart(2, "0")}:${minutes}:${seconds.padStart(2, "0")}+05:30`);
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }

  const parsedDate = new Date(toStrictIsoDateTime(trimmed));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatHourMinuteAmPm = (date: Date) => {
  const local = new Date(date.getTime() + 330 * 60000);
  const hour = local.getUTCHours();
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

export const formatAttendanceTime = (value: string | null | undefined): string => {
  const parsed = parseAttendanceDateTime(value);

  return parsed ? formatHourMinuteAmPm(parsed) : "--:--";
};

export const getWorkingHoursLabel = (record: AttendanceRecord | null | undefined): string => {
  if (!record) {
    return "—";
  }

  if (typeof record.hoursWorked === "number") {
    const totalMinutes = Math.round(record.hoursWorked * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`.trim() || "0m";
  }

  if (typeof record.scheduledHours === "number") {
    return `${record.scheduledHours.toFixed(record.scheduledHours % 1 === 0 ? 0 : 1)}h`;
  }

  return "—";
};

export const getTodayAttendanceDateKey = (): string => {
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  const istDate = new Date(Date.now() + IST_OFFSET_MINUTES * 60000);

  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatAttendanceDate = (dateKey: string | null | undefined, fallback = "--") => {
  if (!dateKey) {
    return fallback;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());

  if (!match) {
    return fallback;
  }

  const [, year, month, day] = match;

  return `${day}-${month}-${year}`;
};

const ATTENDANCE_ERROR_MESSAGES: Record<AttendanceErrorKind, string> = {
  forbidden: "You don't have permission to manage attendance.",
  network: "No internet connection. Please check your network and try again.",
  server: "Something went wrong on our end. Please try again in a moment.",
  timeout: "The request took too long. Please try again.",
  unauthorized: "Your session has expired. Please log in again.",
  unknown: "Something went wrong. Please try again.",
};

export const getAttendanceErrorMessage = (
  kind: AttendanceErrorKind | null | undefined,
  fallback?: string | null,
): string => {
  if (fallback && fallback.trim()) {
    return fallback;
  }

  return kind ? ATTENDANCE_ERROR_MESSAGES[kind] : ATTENDANCE_ERROR_MESSAGES.unknown;
};
