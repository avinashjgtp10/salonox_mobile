/** Preserve custom spelling; only known default keys get display labels. */
export function paymentMethodLabel(value: string): string {
  switch (value.toLowerCase()) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "upi": return "UPI";
    case "split": return "Split";
    default: return value.trim();
  }
}
