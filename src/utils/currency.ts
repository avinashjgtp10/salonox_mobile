import { formatAmountIn, formatAmountCompactIn, getCurrencyDef } from "@/config/currencies";
import { getRegionalPreferences } from "@/localization/preferences";

export const getCurrentCurrency = () => getCurrencyDef(getRegionalPreferences().currency);
export const currencySymbol = () => getCurrentCurrency().symbol.trim();
export const currencyLocale = () => getCurrentCurrency().locale;
/** Currency labels in UI copy; amounts themselves are never converted. */
export const currencyLabel = (text: string) => text.replace(/₹/g, (_, offset: number) =>
  /\d/.test(text[offset + 1] ?? "") ? getCurrentCurrency().symbol : currencySymbol());
/**
 * Rewrites money written in free text (Lunox's AI insight and answers) into the
 * salon's own currency. The assistant is handed amounts already formatted by the
 * server, but it sometimes re-writes them in rupees with Indian lakh grouping —
 * "₹2,02,430" on a UAE salon's dashboard. Swapping the symbol alone would leave
 * that grouping behind, so the amount is parsed and formatted again for the
 * active currency: "₹2,02,430" becomes "AED 202,430".
 *
 * Only the currency notation changes; the amount itself is never converted, and
 * decimals are kept only where they were written. Text already in the salon's
 * currency passes through untouched.
 */
export const localizeCurrencyText = (text: string) =>
  text.replace(/(?:₹|Rs\.?\s?|INR\s)\s*(\d[\d,]*(?:\.\d+)?)/gi, (whole, amount: string) => {
    const value = Number(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(value)) return whole;
    return formatAmountIn(value, getCurrentCurrency(), {
      decimals: String(amount).includes(".") ? 2 : 0,
    });
  });
export const formatCurrency = (amount: number) => formatAmountIn(amount, getCurrentCurrency());
export const formatCurrencyRounded = (amount: number) => formatAmountIn(Math.round(Number(amount) || 0), getCurrentCurrency(), { decimals: 0 });
export const formatCurrencyCompact = (amount: number) => formatAmountCompactIn(amount, getCurrentCurrency());
