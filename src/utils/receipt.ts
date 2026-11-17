import { formatAppDate } from "./dateTime";
import { formatCurrency } from "./currency";
import type { SaleDetail } from "@/types/sales";

export type InvoiceSequence = string | number | null | undefined;

/** "online_payment" -> "Online Payment" */
const labelizeMethod = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * How a sale was paid, for display.
 *
 * A split payment stores its breakdown in payment_reference as a JSON map
 * ({"Cash":1599,"Membership":319.8} — see buildCheckoutRequestBody), so showing
 * the raw reference prints JSON at the user. Render it as "Cash ₹1,599.00 ·
 * Membership ₹319.80" instead, and fall back to the plain method if it is not
 * the expected shape.
 */
export function formatPaymentSummary(
  method: string | null | undefined,
  reference?: string | null,
): string {
  if (!method) return "—";
  const label = labelizeMethod(method);
  if (!reference) return label;

  if (method.toLowerCase() === "split") {
    try {
      const parsed: unknown = JSON.parse(reference);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const parts = Object.entries(parsed as Record<string, unknown>)
          .filter(([, amount]) => Number.isFinite(Number(amount)))
          .map(([name, amount]) => `${labelizeMethod(name)} ${formatCurrency(Number(amount))}`);
        if (parts.length) return parts.join(" · ");
      }
    } catch {
      // Not the JSON breakdown — fall through to the plain reference below.
    }
    return label;
  }

  return `${label} · ${reference}`;
}

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
