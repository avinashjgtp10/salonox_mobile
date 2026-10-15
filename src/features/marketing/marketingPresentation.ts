import type { MarketingCampaign, MarketingStats } from "@/types/marketing";

export type MarketingMetric = "sent" | "delivered" | "read" | "failed";
export const metricColors = { sent: "#16a36a", delivered: "#3478f6", read: "#8b5cf6", failed: "#ef4444", blocked: "#f59e0b", transit: "#e8e8e6" };
export const percent = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function filterMarketingCampaigns(campaigns: MarketingCampaign[], status: string, start: string | null, end: string | null) {
  return campaigns.filter(c => {
    const matchesStatus = status === "ALL" || (status === "RUNNING" ? ["RUNNING", "SENDING"].includes(c.status) : c.status === status);
    if (!matchesStatus) return false;
    if ((!start && !end) || !c.created_at) return true;
    // Use the same timestamp boundaries as the web dashboard, including end of day.
    const date = new Date(c.created_at).getTime();
    return date >= (start ? new Date(start).getTime() : -Infinity)
      && date <= (end ? new Date(`${end}T23:59:59`).getTime() : Infinity);
  });
}
export function rollupMarketingCampaigns(campaigns: MarketingCampaign[]): Omit<MarketingStats, "sentToday" | "topCampaigns"> {
  return campaigns.reduce((s, c) => ({
    totalSent: s.totalSent + c.sent_count, totalDelivered: s.totalDelivered + c.delivered_count,
    totalRead: s.totalRead + c.read_count, totalFailed: s.totalFailed + c.failed_count,
    totalBlocked: s.totalBlocked + c.blocked_count, totalCampaigns: s.totalCampaigns + 1,
    completedCampaigns: s.completedCampaigns + (c.status === "COMPLETED" ? 1 : 0),
  }), { totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, totalBlocked: 0, totalCampaigns: 0, completedCampaigns: 0 });
}
export function marketingSeries(campaigns: MarketingCampaign[], start: string | null, end: string | null, today = new Date()) {
  const endDate = end ? new Date(`${end}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = start ? new Date(`${start}T00:00:00`) : new Date(endDate);
  if (!start) startDate.setDate(startDate.getDate() - 29);
  const earliest = new Date(endDate); earliest.setDate(earliest.getDate() - 61);
  if (startDate < earliest) startDate.setTime(earliest.getTime());
  const series: { date: string; label: string; sent: number; delivered: number; read: number; failed: number }[] = [];
  for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    series.push({ date: dateKey(d), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), sent: 0, delivered: 0, read: 0, failed: 0 });
  }
  const byDate = new Map(series.map(day => [day.date, day]));
  for (const c of campaigns) {
    if (!c.created_at) continue;
    const day = byDate.get(dateKey(new Date(c.created_at)));
    if (day) { day.sent += c.sent_count; day.delivered += c.delivered_count; day.read += c.read_count; day.failed += c.failed_count; }
  }
  return series;
}
// Read is a subset of delivered: partition the ring without double counting it.
export function marketingStatusParts(s: Pick<MarketingStats, "totalSent" | "totalDelivered" | "totalRead" | "totalFailed" | "totalBlocked">) {
  const read = Math.min(s.totalRead, s.totalDelivered || s.totalRead);
  return [
    { value: read, color: metricColors.read },
    { value: Math.max(0, s.totalDelivered - read), color: metricColors.delivered },
    { value: s.totalFailed, color: metricColors.failed },
    { value: s.totalBlocked, color: metricColors.blocked },
    { value: Math.max(0, s.totalSent - s.totalDelivered - s.totalFailed - s.totalBlocked), color: metricColors.transit },
  ];
}
