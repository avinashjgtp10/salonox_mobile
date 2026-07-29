export type InvoiceSequence = string | number | null | undefined;

/**
 * Kept in lockstep with the Web Frontend's printReceipt().
 */
export function formatInvoiceNumber(invoiceSeq: InvoiceSequence): string | null {
  return invoiceSeq
    ? `INV-${String(invoiceSeq).padStart(5, "0")}`
    : null;
}
