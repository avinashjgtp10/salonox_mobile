import type { AppointmentListItem } from "@/types/appointment";
import { formatInvoiceNumber } from "@/utils/receipt";

export function maskClientName(value?: string | null): string {
  const letters = Array.from(value?.trim() || "");
  return letters.length ? letters.slice(0, 2).join("") + "*".repeat(Math.max(0, letters.length - 2)) : "-";
}

export function getAppointmentBillLabel(appointment: AppointmentListItem): string {
  const raw = appointment.raw;
  for (const key of ["invoice_number", "invoiceNumber", "invoice_no", "invoiceNo", "receipt_number", "receiptNumber", "bill_number", "billNumber"]) {
    const value = raw[key];
    if ((typeof value === "string" && value.trim()) || typeof value === "number") {
      return key.startsWith("invoice") ? formatInvoiceNumber(value)! : String(value).trim();
    }
  }
  return "Invoice not generated";
}
