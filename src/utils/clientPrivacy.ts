import type { AppointmentListItem } from "@/types/appointment";
import type { AuthUser } from "@/types/auth";
import { formatInvoiceNumber } from "@/utils/receipt";

/** Owner's "Client name access" switch: lets a staff member see full client names. */
export const canSeeFullClientNames = (user?: AuthUser | null) => user?.mobileClientNameAccess === true;

/** Staff view of a client name: masked ("Pr****") unless showFullName. */
export function maskClientName(value?: string | null, showFullName = false): string {
  if (showFullName) return value?.trim() || "-";
  const letters = Array.from(value?.trim() || "");
  return letters.length ? letters.slice(0, 2).join("") + "*".repeat(Math.max(0, letters.length - 2)) : "-";
}

/** The bill/invoice number, or null while none has been generated. */
export function getAppointmentInvoiceLabel(appointment: AppointmentListItem): string | null {
  const raw = appointment.raw;
  for (const key of ["invoice_number", "invoiceNumber", "invoice_no", "invoiceNo", "receipt_number", "receiptNumber", "bill_number", "billNumber"]) {
    const value = raw[key];
    if ((typeof value === "string" && value.trim()) || typeof value === "number") {
      return key.startsWith("invoice") ? formatInvoiceNumber(value)! : String(value).trim();
    }
  }
  return null;
}

/** Staff heading for an appointment: its invoice number, else the (masked) client name. */
export function getAppointmentBillLabel(appointment: AppointmentListItem, showFullName = false): string {
  return getAppointmentInvoiceLabel(appointment)
    ?? (appointment.clientName?.trim() ? maskClientName(appointment.clientName, showFullName) : "Walk-in");
}
