export const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const parseAmount = (value: string) => {
  const numeric = Number(value.replace(/[^\d.]/g, ""));

  return Number.isFinite(numeric) ? numeric : 0;
};

const toCents = (amount: number) => Math.round(amount * 100);

// Two independently-computed currency amounts (e.g. the Mobile pricing
// total vs. what the backend actually persisted) rarely land on the exact
// same float, even when they agree — each side rounds its own tax/discount
// math to 2dp separately. Comparing in integer cents/paise with a 1-cent
// tolerance absorbs that normal rounding drift while still catching a
// genuine mismatch (a missing discount, a dropped line item, etc.), which
// is always far larger than a single cent.
export const amountsReconcile = (a: number, b: number, toleranceCents = 1) =>
  Math.abs(toCents(a) - toCents(b)) <= toleranceCents;
