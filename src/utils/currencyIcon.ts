import {
  CurrencyRupee,
  CurrencyDollar,
  CurrencyEuro,
  CurrencyPound,
  CurrencyYen,
  CurrencyExchange,
} from "react-bootstrap-icons";

// Only currencies with a dedicated react-bootstrap-icons glyph get their own
// icon — anything else falls back to a neutral currency-exchange icon rather
// than showing a misleading ₹ symbol when e.g. AED or THB is selected.
const CURRENCY_ICON: Record<string, typeof CurrencyRupee> = {
  INR: CurrencyRupee,
  USD: CurrencyDollar,
  EUR: CurrencyEuro,
  GBP: CurrencyPound,
  JPY: CurrencyYen,
};

export function getCurrencyIcon(code: string) {
  return CURRENCY_ICON[code] ?? CurrencyExchange;
}
