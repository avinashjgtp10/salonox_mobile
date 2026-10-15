// Mirrors the web app's formatAmount (hooks/useCurrency.ts): paise-precise everywhere.
export const formatCurrency = (amount: number) =>
  `₹${(Number(amount) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Mirrors the web dashboard's revenue cards: rounded to the nearest rupee.
export const formatCurrencyRounded = (amount: number) =>
  `₹${(Math.round(Number(amount) || 0) || 0).toLocaleString("en-IN")}`;
