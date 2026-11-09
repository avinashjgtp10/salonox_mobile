import { formatAmountIn, formatAmountCompactIn, getCurrencyDef } from "@/config/currencies";
import { getRegionalPreferences } from "@/localization/preferences";

export const getCurrentCurrency = () => getCurrencyDef(getRegionalPreferences().currency);
export const currencySymbol = () => getCurrentCurrency().symbol.trim();
export const currencyLocale = () => getCurrentCurrency().locale;
/** Currency labels in UI copy; amounts themselves are never converted. */
export const currencyLabel = (text: string) => text.replace(/₹/g, (_, offset: number) =>
  /\d/.test(text[offset + 1] ?? "") ? getCurrentCurrency().symbol : currencySymbol());
export const formatCurrency = (amount: number) => formatAmountIn(amount, getCurrentCurrency());
export const formatCurrencyRounded = (amount: number) => formatAmountIn(Math.round(Number(amount) || 0), getCurrentCurrency(), { decimals: 0 });
export const formatCurrencyCompact = (amount: number) => formatAmountCompactIn(amount, getCurrentCurrency());
