export const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const parseAmount = (value: string) => {
  const numeric = Number(value.replace(/[^\d.]/g, ""));

  return Number.isFinite(numeric) ? numeric : 0;
};

const toCents = (amount: number) => Math.round(amount * 100);

export const amountsReconcile = (a: number, b: number, toleranceCents = 1) =>
  Math.abs(toCents(a) - toCents(b)) <= toleranceCents;
