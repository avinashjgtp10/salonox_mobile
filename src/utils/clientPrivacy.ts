import type { AppointmentListItem } from "@/types/appointment";
import { formatInvoiceNumber } from "@/utils/receipt";

export function maskClientName(value?: string | null): string {
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

/** Staff heading for an appointment: its invoice number, else the masked client name. */
export function getAppointmentBillLabel(appointment: AppointmentListItem): string {
  return getAppointmentInvoiceLabel(appointment)
    ?? (appointment.clientName?.trim() ? maskClientName(appointment.clientName) : "Walk-in");
}
