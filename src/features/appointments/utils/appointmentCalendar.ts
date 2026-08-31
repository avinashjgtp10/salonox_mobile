import type { AppointmentListItem } from "@/types/appointment";

import { parseAppointmentDateTime } from "./appointmentDateTime";

const WEB_CALENDAR_STATUS_GRADIENTS = {
  booked: ["#f59e0b", "#d97706"],
  cancelled: ["#ef4444", "#dc2626"],
  deleted: ["#9ca3af", "#6b7280"],
  noShow: ["#22d3ee", "#0891b2"],
  paid: ["#22c55e", "#16a34a"],
  partial: ["#7c3aed", "#6d28d9"],
} as const;

export const getWebCalendarGradient = (appointment: AppointmentListItem) => {
  if (appointment.status === "Deleted") return WEB_CALENDAR_STATUS_GRADIENTS.deleted;
  if (appointment.status === "Cancelled") return WEB_CALENDAR_STATUS_GRADIENTS.cancelled;
  if (appointment.status === "Missed") return WEB_CALENDAR_STATUS_GRADIENTS.noShow;
  if (appointment.status === "Partial") return WEB_CALENDAR_STATUS_GRADIENTS.partial;

  const isPaid = appointment.paymentStatus.toLowerCase() === "paid" ||
    (appointment.total > 0 && appointment.paidAmount >= appointment.total);
  if (isPaid || appointment.status === "Completed" || appointment.status === "Confirmed") {
    return WEB_CALENDAR_STATUS_GRADIENTS.paid;
  }

  return WEB_CALENDAR_STATUS_GRADIENTS.booked;
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
