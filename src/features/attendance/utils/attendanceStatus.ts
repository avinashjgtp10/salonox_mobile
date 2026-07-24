import type { ThemeColors } from "@/constants/theme";
import type {
  AttendanceActionKind,
  AttendanceRecord,
  AttendanceStatusKey,
  ManualAttendanceStatus,
} from "@/types/attendance";
import type { AttendanceErrorKind } from "@/middleware/attendance/attendance.thunk";

export type AttendanceStatusIconName =
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

// Single source of truth for how the backend status renders everywhere in
// the UI (list badges, chips, progress bar tint). Takes the active theme's
// Colors so callers stay in sync with light/dark mode instead of baking in a
// static palette.
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

// Renders when a staff member has no
// attendance record for today at all (attendance not yet marked), which is
// distinct from any status value the backend can actually return.
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

// Looks up the badge config for a staff member's attendance record, falling
// back to the "not marked" config when no record exists for today yet.
export const getAttendanceBadgeConfig = (
  record: AttendanceRecord | null | undefined,
  Colors: ThemeColors,
): AttendanceStatusConfig | Omit<AttendanceStatusConfig, "key"> =>
  record ? getAttendanceStatusConfig(record.statusKey, Colors) : buildNotMarkedStatusConfig(Colors);

export type AttendanceAction = {
  kind: AttendanceActionKind;
  label: string;
};

// Derives the single primary action every staff row must always offer,
// matching the Web App's contract exactly: timestamps decide actions,
// independently from the backend status label.
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

// The finite set of statuses a manager can set by hand, in the exact order
// the Web App's Edit Attendance modal presents them.
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

// Reverse of the backend status mapping, used to pre-populate the Edit
// modal's status dropdown from an existing record.
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

// Backend timestamps arrive as Postgres-style "YYYY-MM-DD HH:MM:SS+00" (or
// plain "HH:MM") strings that Hermes cannot reliably hand to `new Date()`.
// Mirrors the same normalization already used for appointment times.
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

  // Some backends send only a bare time ("09:15:00" / "09:15") for
  // check-in/check-out rather than a full timestamp. Anchor it to today so
  // it can still be formatted and diffed like a real Date.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [hours, minutes, seconds = "0"] = trimmed.split(":");
    const anchored = new Date();

    anchored.setHours(Number(hours), Number(minutes), Number(seconds), 0);

    return anchored;
  }

  const parsedDate = new Date(toStrictIsoDateTime(trimmed));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Deterministic 12-hour "H:MM AM/PM" formatting, built manually rather than
// via Intl.DateTimeFormat whose AM/PM casing isn't guaranteed consistent
// across the ICU data bundled with different JS engines.
export const formatHourMinuteAmPm = (date: Date) => {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minutes} ${ampm}`;
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
    const hours = Math.floor(record.hoursWorked);
    const minutes = Math.round((record.hoursWorked - hours) * 60);

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`.trim() || "0m";
  }

  if (typeof record.scheduledHours === "number") {
    return `${record.scheduledHours.toFixed(record.scheduledHours % 1 === 0 ? 0 : 1)}h`;
  }

  return "—";
};

// The backend always computes "today" in Asia/Kolkata (see attendance
// controller/service), so manual-mark's required `date` must be derived the
// same way — using the device's local date would mark the wrong day for
// anyone outside IST, or near midnight. Computed manually (fixed +5:30
// offset, no DST in India) rather than via toLocaleDateString's `timeZone`
// option, whose ICU/timezone-data support is inconsistent across Hermes
// builds — same reasoning as formatHourMinuteAmPm above.
export const getTodayAttendanceDateKey = (): string => {
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  const istDate = new Date(Date.now() + IST_OFFSET_MINUTES * 60000);

  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
