import { formatAppDate } from "./dateTime";
import type { SaleDetail } from "@/types/sales";

export type InvoiceSequence = string | number | null | undefined;

export function invoiceDateLabel(sale: Pick<SaleDetail, "invoiceDate" | "createdDateLabel">): string {
  return formatAppDate(sale.invoiceDate, "") || sale.createdDateLabel.split(/\s*[•·]\s*/)[0] || "—";
}

export function formatInvoiceNumber(invoiceSeq: InvoiceSequence): string | null {
  if (invoiceSeq === null || invoiceSeq === undefined || invoiceSeq === "") {
    return null;
  }

  const invoiceNumber = String(invoiceSeq).trim();

  if (!invoiceNumber) {
    return null;
  }

  if (invoiceNumber.startsWith("INV-")) {
    return invoiceNumber;
  }

  return `INV-${invoiceNumber.padStart(5, "0")}`;
}
