import { formatCurrency } from "@/utils/currency";
import type { TaxName } from "@/utils/taxLabels";

export function invoiceItemTax(
  item: { taxAmount?: number; taxableAmount?: number },
  invoiceTax: number,
  taxName: TaxName,
) {
  const { taxAmount, taxableAmount } = item;
  if (taxAmount == null || (invoiceTax > 0 && !taxableAmount && !taxAmount)) {
    return "Item tax details unavailable";
  }
  const rate = taxableAmount ? Number((100 * taxAmount / taxableAmount).toFixed(2)) : null;
  return [taxName, rate == null ? null : `${rate}% effective`, formatCurrency(taxAmount)].filter(Boolean).join(" · ");
}
