export const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const parseAmount = (value: string) => {
  const numeric = Number(value.replace(/[^\d.]/g, ""));

  return Number.isFinite(numeric) ? numeric : 0;
};
