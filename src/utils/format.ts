/**
 * Formats a number to currency in Indian Rupees format (en-IN).
 */
export function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
