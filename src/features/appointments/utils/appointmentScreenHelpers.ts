import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from "@/constants/theme";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import type { AppointmentFormState } from "@/features/appointments/types/appointmentForm";
import { parseAppointmentDateTime } from "@/features/appointments/utils/appointmentDateTime";
import type { AppointmentStatus } from "@/types/appointment";
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
  "Checked In": { bg: Colors.successBg, color: Colors.primaryDark },
  Completed: { bg: Colors.successBg, color: Colors.success },
  Confirmed: { bg: Colors.successBg, color: Colors.primaryDark },
  Deleted: { bg: Colors.bg2, color: Colors.text2 },
  "In Progress": { bg: Colors.infoBg, color: Colors.info },
  "In Service": { bg: Colors.bg2, color: Colors.primaryDark },
  Missed: { bg: Colors.errorBg, color: Colors.error },
  Partial: { bg: Colors.warningBg, color: Colors.warning },
  Unknown: { bg: Colors.bg2, color: Colors.text2 },
  Upcoming: { bg: Colors.warningBg, color: Colors.goldDark },
  Waiting: { bg: Colors.warningBg, color: Colors.goldDark },
});

export const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    return value || "-";
  }

  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
};

export const formatBusinessDate = (value: string | null) => {
  return formatAppDate(parseAppointmentDateTime(value), value ?? "-");
};

export const formatBusinessTime = (value: string | null) => {
  return formatAppTime(parseAppointmentDateTime(value), value ?? "-");
};

export const toInvoiceSequence = (value: unknown): InvoiceSequence =>
  typeof value === "string" || typeof value === "number" ? value : null;
