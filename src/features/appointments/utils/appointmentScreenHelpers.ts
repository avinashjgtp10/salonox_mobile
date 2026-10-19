import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from "@/constants/theme";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import type { AppointmentFormState } from "@/features/appointments/types/appointmentForm";
import { minutesToDisplayTime, parseAppointmentDateTime, parseClockToMinutes } from "@/features/appointments/utils/appointmentDateTime";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import type { InvoiceSequence } from "@/utils/receipt";

export const APPOINTMENT_VALIDATION_FIELD_ORDER: (keyof AppointmentFormState)[] = [
  "clientId",
  "serviceName",
  "staffId",
  "date",
  "startTime",
  "duration",
  "discount",
  "paymentMethod",
  "notes",
];

export const getResponsiveHorizontalPadding = (width = 393) => {
  if (width < 360) {
    return 16;
  }

  if (width >= 768) {
    return 40;
  }

  if (width >= 600) {
    return 32;
  }

  return AppLayout.contentHorizontalPadding;
};

export const getResponsiveTopPadding = (width = 393) => (width < 360 ? Spacing.sm : Spacing.md);

export const getResponsiveHeaderTitleSize = (width = 393) =>
  width < 360 ? AppLayout.headerTitleFontSize - 2 : AppLayout.headerTitleFontSize;

export const getStatusStyles = (Colors: ThemeColors): Record<AppointmentStatus, { bg: string; color: string }> => ({
  Cancelled: { bg: Colors.errorBg, color: Colors.error },
  "Checked In": { bg: Colors.successBg, color: Colors.primaryText },
  Completed: { bg: Colors.successBg, color: Colors.success },
  Confirmed: { bg: Colors.successBg, color: Colors.primaryText },
  Deleted: { bg: Colors.bg2, color: Colors.text2 },
  "In Progress": { bg: Colors.infoBg, color: Colors.info },
  "In Service": { bg: Colors.bg2, color: Colors.primaryText },
  Missed: { bg: Colors.errorBg, color: Colors.error },
  Partial: { bg: Colors.warningBg, color: Colors.warning },
  Unknown: { bg: Colors.bg2, color: Colors.text2 },
  Upcoming: { bg: Colors.warningBg, color: Colors.goldDark },
  Waiting: { bg: Colors.warningBg, color: Colors.goldDark },
});

export type AppointmentPaymentStatus = "Paid" | "Partial" | "Unpaid";

/** Same rule as the web's normalizePaymentStatus: read from the booking's own backend status. */
export const getAppointmentPaymentStatus = (appointment: AppointmentListItem): AppointmentPaymentStatus => {
  const { payment_status: paymentStatus, status } = appointment.raw;
  const raw = typeof status === "string" && status.trim() ? status : paymentStatus;
  const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (normalized === "paid" || normalized === "completed") return "Paid";
  if (normalized === "partial") return "Partial";
  return "Unpaid";
};

// The web's View Appointment status pill (ViewBillModal STATUS_PILL_STYLES).
const WEB_APPOINTMENT_STATUS: Record<string, { bg: string; label: string }> = {
  booked: { bg: "#1D4ED8", label: "Booked" },
  cancelled: { bg: "#991B1B", label: "Cancelled" },
  deleted: { bg: "#9CA3AF", label: "Deleted" },
  "no-show": { bg: "#6B7280", label: "No-show" },
  paid: { bg: "#22C55E", label: "Paid" },
  partial: { bg: "#F59E0B", label: "Partial" },
};

/** Booked / No-show / Paid / Partial / Cancelled, labelled exactly as on the web. */
export const getAppointmentWebStatus = (appointment: AppointmentListItem) => {
  if (appointment.status === "Cancelled") return WEB_APPOINTMENT_STATUS.cancelled;
  const raw = typeof appointment.raw.status === "string"
    ? appointment.raw.status.trim().toLowerCase().replace(/[_\s]+/g, "-")
    : "";
  const key = raw === "completed" ? "paid" : raw === "noshow" ? "no-show" : raw;

  return WEB_APPOINTMENT_STATUS[key] ?? { bg: "#6B7280", label: appointment.status };
};

/** Every staff member on the appointment (lead + each row), as the web's Staff row lists them. */
export const getAppointmentStaffNames = (appointment: AppointmentListItem) =>
  [...new Set([appointment.staffName, ...appointment.billedItems.map((item) => item.staffName)]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name) && name !== "-"))];

/** A row's booked slot: "HH:MM" clock values or full timestamps. */
export const formatItemTime = (value: string | null) => {
  if (!value) return null;
  const minutes = /^\d{1,2}:\d{2}$/.test(value.trim()) ? parseClockToMinutes(value) : null;
  return minutes !== null ? minutesToDisplayTime(minutes) : formatBusinessTime(value);
};

export const getPaymentStatusStyles =(Colors: ThemeColors): Record<AppointmentPaymentStatus, { bg: string; color: string }> => ({
  Paid: { bg: Colors.successBg, color: Colors.success },
  Partial: { bg: Colors.accentIndigoSoft, color: Colors.accentIndigo },
  Unpaid: { bg: Colors.warningBg, color: Colors.goldDark },
});

export const getRejectedMessage =(payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export { maskPhone } from "@/utils/maskPhone";

export const formatBusinessDate = (value: string | null) => {
  return formatAppDate(parseAppointmentDateTime(value), value ?? "-");
};

export const formatBusinessTime = (value: string | null) => {
  return formatAppTime(parseAppointmentDateTime(value), value ?? "-");
};

export const toInvoiceSequence = (value: unknown): InvoiceSequence =>
  typeof value === "string" || typeof value === "number" ? value : null;
