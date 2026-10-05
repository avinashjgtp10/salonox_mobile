export type InvoiceSequence = string | number | null | undefined;

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
