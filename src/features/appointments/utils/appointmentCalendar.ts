import { localItemTime } from "@/features/quickSale/utils/itemTime";
import type { AppointmentListItem } from "@/types/appointment";

import { parseAppointmentDateTime } from "./appointmentDateTime";

// The web calendar chip palette (DayView.scss .dv-chip--*): pastel 135deg
// gradient with a solid accent bar on the left.
const WEB_CALENDAR_CHIP_STYLES = {
  cancelled: { accent: "#dc2626", colors: ["#fee2e2", "#fca5a5"] },
  confirmed: { accent: "#16a34a", colors: ["#dcfce7", "#86efac"] },
  deleted: { accent: "#6b7280", colors: ["#e5e7eb", "#d1d5db"] },
  noShow: { accent: "#2563eb", colors: ["#dbeafe", "#93c5fd"] },
  partial: { accent: "#7c3aed", colors: ["#e9d5ff", "#c4b5fd"] },
  pending: { accent: "#d97706", colors: ["#fef3c7", "#fde68a"] },
} as const;

/** Web computeChipStatusClass: a still-booked appointment past its end shows as no-show. */
export const getWebCalendarChipStyle = (appointment: AppointmentListItem, now = Date.now()) => {
  if (appointment.status === "Deleted") return WEB_CALENDAR_CHIP_STYLES.deleted;
  if (appointment.status === "Cancelled") return WEB_CALENDAR_CHIP_STYLES.cancelled;
  if (appointment.status === "Completed") return WEB_CALENDAR_CHIP_STYLES.confirmed;
  if (appointment.status === "Partial") return WEB_CALENDAR_CHIP_STYLES.partial;
  if (appointment.status === "No Show") return WEB_CALENDAR_CHIP_STYLES.noShow;

  const range = getAppointmentRange(appointment);
  return range && range.end < now ? WEB_CALENDAR_CHIP_STYLES.noShow : WEB_CALENDAR_CHIP_STYLES.pending;
};

export type CalendarItemSegment = { endMin: number; name: string; staffId: string; startMin: number };

const DAY_END_MIN = 24 * 60 - 1;
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const readRows = (raw: Record<string, unknown>, ...keys: string[]) => {
  const rows = keys.map((key) => raw[key]).find(Array.isArray);
  return (rows ?? []).filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
};
const readString = (row: Record<string, unknown>, ...keys: string[]) => {
  const value = keys.map((key) => row[key]).find((candidate) => typeof candidate === "string" || typeof candidate === "number");
  return value === undefined ? "" : String(value).trim();
};

/**
 * Each item's own staff and time slot, as the web's getStaffSegments: a
 * service runs for its duration, any other item takes 30 minutes.
 */
export const getAppointmentItemSegments = (appointment: AppointmentListItem): CalendarItemSegment[] => {
  const raw = appointment.raw as Record<string, unknown>;
  const fallbackStart = localItemTime(appointment.scheduledAt);
  const toSegment = (row: Record<string, unknown>, isService: boolean): CalendarItemSegment | null => {
    const staffId = readString(row, "staff_id", "staffId");
    const start = localItemTime(readString(row, "time", "start_time", "startTime")) ?? fallbackStart;
    if (!staffId || !start) return null;
    const startMin = toMinutes(start);
    const explicitEnd = isService ? localItemTime(readString(row, "end_time", "endTime")) : undefined;
    const duration = isService ? Number(readString(row, "duration_minutes", "duration")) || 30 : 30;
    const endMin = explicitEnd ? toMinutes(explicitEnd) : startMin + duration;
    const name = readString(row, "name", "service", "service_name", "product_name", "productName", "package_name", "packageName", "membership_name", "membershipName");
    return { endMin: endMin <= startMin ? DAY_END_MIN : Math.min(endMin, DAY_END_MIN), name, staffId, startMin };
  };

  return [
    ...readRows(raw, "services").map((row) => toSegment(row, true)),
    ...readRows(raw, "package_items", "packageItems").map((row) => toSegment(row, false)),
    ...readRows(raw, "product_items", "productItems").map((row) => toSegment(row, false)),
    ...readRows(raw, "membership_items", "membershipItems").map((row) => toSegment(row, false)),
  ].filter((segment): segment is CalendarItemSegment => Boolean(segment));
};

const getCalendarItemNames = (value: unknown, keys: string[]) => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const name = keys
      .map((key) => record[key])
      .find((candidate) => typeof candidate === "string" && candidate.trim());

    return typeof name === "string" ? [name.trim()] : [];
  });
};

export const getCalendarAppointmentTitle = (appointment: AppointmentListItem) => {
  const rawTitle = typeof appointment.raw.title === "string" ? appointment.raw.title.trim() : "";

  if (rawTitle && rawTitle.toLowerCase() !== "appointment") return rawTitle;

  const itemNames = [
    ...getCalendarItemNames(appointment.raw.services, ["name", "service"]),
    ...getCalendarItemNames(appointment.raw.productItems ?? appointment.raw.product_items, ["productName", "product_name", "name"]),
    ...getCalendarItemNames(appointment.raw.packageItems ?? appointment.raw.package_items, ["packageName", "package_name", "name"]),
    ...getCalendarItemNames(appointment.raw.membershipItems ?? appointment.raw.membership_items, ["membershipName", "membership_name", "name"]),
  ];

  return itemNames.join(", ") || appointment.serviceName || "Appointment";
};

export const getCalendarTokenLabel = (appointment: AppointmentListItem) => {
  const rawToken = appointment.raw.token_id ??
    appointment.raw.tokenId ??
    appointment.raw.token_number ??
    appointment.raw.tokenNumber ??
    appointment.raw.token;
  const token = typeof rawToken === "string" || typeof rawToken === "number"
    ? String(rawToken).trim()
    : "";

  if (!token) return "";
  return /^\d+$/.test(token) ? `TK${token}` : token;
};

export const isReadonlyCalendarAppointment = (appointment: AppointmentListItem) =>
  appointment.status === "Cancelled" || appointment.status === "Deleted";

export const hasCalendarInteractionFlag = (
  appointment: AppointmentListItem,
  camelCase: string,
  snakeCase: string,
) => appointment.raw[camelCase] === true || appointment.raw[snakeCase] === true;

export const getAppointmentRange = (appointment: AppointmentListItem) => {
  const start = parseAppointmentDateTime(appointment.scheduledAt)?.getTime();
  if (start === undefined) return null;
  const explicitEnd = parseAppointmentDateTime(appointment.endTime)?.getTime();
  const end = explicitEnd && explicitEnd > start
    ? explicitEnd
    : start + (appointment.durationMinutes ?? 30) * 60_000;
  return { end, start };
};

export const appointmentsOverlap = (left: AppointmentListItem, right: AppointmentListItem) => {
  const leftRange = getAppointmentRange(left);
  const rightRange = getAppointmentRange(right);
  return Boolean(leftRange && rightRange && leftRange.start < rightRange.end && rightRange.start < leftRange.end);
};
