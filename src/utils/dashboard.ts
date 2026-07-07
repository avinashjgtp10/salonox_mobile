export const formatDashboardRevenue = (value: number) => {
  if (!value) {
    return "Rs. 0";
  }

  const absoluteValue = Math.abs(value);
  const prefix = value < 0 ? "-Rs. " : "Rs. ";

  if (absoluteValue < 1000) {
    return `${prefix}${absoluteValue.toLocaleString("en-IN")}`;
  }

  if (absoluteValue < 100000) {
    const formattedValue =
      absoluteValue % 1000 === 0
        ? (absoluteValue / 1000).toFixed(0)
        : (absoluteValue / 1000).toFixed(1);

    return `${prefix}${formattedValue}k`;
  }

  const formattedValue =
    absoluteValue % 100000 === 0
      ? (absoluteValue / 100000).toFixed(0)
      : (absoluteValue / 100000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

  return `${prefix}${formattedValue}L`;
};
