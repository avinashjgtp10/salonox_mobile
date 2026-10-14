// Same least-squares daily trend as the web dashboard. The monthly forecast
// itself comes from the backend's run-rate calculation, not this chart line.
export function buildProjectionTrend(daily: { day: number; sales: number }[], daysInMonth: number) {
  const mean = daily.length ? daily.reduce((sum, row) => sum + row.sales, 0) / daily.length : 0;
  const meanDay = daily.length ? daily.reduce((sum, row) => sum + row.day, 0) / daily.length : 0;
  const denominator = daily.reduce((sum, row) => sum + (row.day - meanDay) ** 2, 0);
  const slope = denominator ? daily.reduce((sum, row) => sum + (row.day - meanDay) * (row.sales - mean), 0) / denominator : 0;
  return Array.from({ length: daysInMonth }, (_, i) => Math.max(0, mean + slope * (i + 1 - meanDay)));
}
