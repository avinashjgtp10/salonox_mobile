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

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const toTitle = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Figures for the bill's Sales Summary card (same rows as the web's View
 * Appointment): subtotal, bill-level discounts, GST, extra charges, tip and
 * how the paid amount was collected. Everything is read off the appointment
 * response (tax_breakdown, ex_charges, split_details, …).
 */
export const getAppointmentSalesSummary = (appointment: AppointmentListItem) => {
  const { raw } = appointment;
  const subtotal = roundMoney(appointment.billedItems.reduce((sum, item) => sum + (item.totalAmount ?? item.price), 0));

  const discountValue = Number(raw.discount_value) || 0;
  const discount = discountValue > 0
    ? roundMoney(String(raw.discount_type).toLowerCase() === "percentage" ? subtotal * discountValue / 100 : discountValue)
    : 0;
  const couponDiscount = Number(raw.coupon_discount_amount) || 0;
  const couponCode = typeof raw.coupon_code === "string" ? raw.coupon_code.trim() : "";

  // One combined GST line (e.g. "CGST + GST (20%)"), as the web shows it.
  const taxEntries = (Array.isArray(raw.tax_breakdown) ? raw.tax_breakdown : [])
    .map((entry) => (entry && typeof entry === "object" ? entry as Record<string, unknown> : {}))
    .filter((entry) => (Number(entry.amount) || 0) > 0);
  const totalTax = roundMoney(taxEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0));
  const taxRate = roundMoney(taxEntries.reduce((sum, entry) => sum + (Number(entry.rate) || 0), 0));
  const taxLabel = taxEntries.length
    ? `${taxEntries.map((entry) => String(entry.name ?? "Tax")).join(" + ")}${taxRate > 0 ? ` (${taxRate}%)` : ""}`
    : "";

  // Split legs (eWallet excluded) when the bill was split; otherwise the one
  // recorded method for the whole paid amount.
  const splitDetails = raw.split_details && typeof raw.split_details === "object"
    ? Object.entries(raw.split_details as Record<string, unknown>)
      .map(([method, amount]) => ({ amount: Number(amount) || 0, method: toTitle(method) }))
      .filter((entry) => entry.amount > 0 && entry.method.toLowerCase() !== "ewallet")
    : [];
  const mode = typeof raw.payment_method === "string" ? raw.payment_method.trim() : "";
  const paymentMethods = splitDetails.length
    ? splitDetails
    : mode && !["package", "split", "ewallet"].includes(mode.toLowerCase()) && appointment.paidAmount > 0
      ? [{ amount: appointment.paidAmount, method: toTitle(mode) }]
      : [];

  return {
    couponCode,
    couponDiscount,
    discount,
    exCharges: Number(raw.ex_charges) || 0,
    paymentMethods,
    subtotal,
    taxLabel,
    tipAmount: Number(raw.tip_amount) || 0,
    totalTax,
  };
};

/** End of the booking: end_time, else start + duration (the web shows a range). */
export const getAppointmentEndValue = (appointment: AppointmentListItem) => {
  if (appointment.endTime) return appointment.endTime;
  const start = parseAppointmentDateTime(appointment.startTime || appointment.scheduledAt);

  return start && appointment.durationMinutes
    ? new Date(start.getTime() + appointment.durationMinutes * 60_000).toISOString()
    : null;
};

/**
 * Total and remaining balance for a partially paid appointment, mirroring the
 * web's bookingMapper (grandTotalVal / dueAmount):
 * - Total: computed_grand_total minus wallet/eWallet/points/referral
 *   redemptions when the API sends it (only after a post-payment edit),
 *   otherwise paid + due — both are recorded server-side against the
 *   post-redemption bill (₹3,000.00 paid + ₹394.00 due = ₹3,394.00).
 * - Due: the API's due_amount when positive, else total - paid.
 * Falls back to billedTotal when the API returned no due_amount at all.
 */
export const getPartialBillAmounts = (appointment: AppointmentListItem, billedTotal: number) => {
  const { raw, paidAmount, dueAmount } = appointment;
  const computedGrandTotal = Number(raw.computed_grand_total);
  const redemptionsUsed = ["membership_wallet_used", "ewallet_used", "reward_points_value", "referral_credit_used"]
    .reduce((sum, key) => sum + (Number(raw[key]) || 0), 0);

  const total = Number.isFinite(computedGrandTotal) && raw.computed_grand_total != null
    ? Math.max(0, roundMoney(computedGrandTotal - redemptionsUsed))
    : dueAmount !== null
      ? roundMoney(paidAmount + Math.max(0, dueAmount))
      : billedTotal;
  const due = dueAmount !== null && dueAmount > 0 ? dueAmount : Math.max(0, roundMoney(total - paidAmount));

  return { due, total };
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
