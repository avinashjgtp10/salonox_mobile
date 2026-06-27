/**
 * Currency symbol used across the entire UI.
 * Defaults to "₹" — call setCurrencySymbol() at app startup
 * (e.g. from salon settings) to switch to any other symbol.
 */
export let currencySymbol = "₹";

export function setCurrencySymbol(symbol: string) {
  currencySymbol = symbol;
}
