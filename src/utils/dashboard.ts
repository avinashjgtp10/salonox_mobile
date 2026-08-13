export const formatDashboardRevenue = (value: number) => {
  const absoluteValue = Math.abs(value);
  const prefix = value < 0 ? "-₹" : "₹";
  const formattedValue = absoluteValue.toLocaleString("en-IN", {
    maximumFractionDigits: 20,
  });

  return `${prefix}${formattedValue}`;
};
