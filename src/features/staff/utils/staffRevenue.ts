import type { StaffMember } from "@/data/teamData";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function getStaffRevenueRanges(day: string) {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  const monday = new Date(year, month - 1, dayOfMonth);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return {
    today: { start_date: day, end_date: day },
    weekly: { start_date: dateKey(monday), end_date: day },
    monthly: { start_date: `${day.slice(0, 7)}-01`, end_date: day },
  };
}

export function findStaffRevenue(
  member: Pick<StaffMember, "id" | "userId" | "staffIdAliases">,
  rows: { id: string; revenue: number }[],
) {
  const ids = new Set([member.id, member.userId, ...(member.staffIdAliases ?? [])].filter(Boolean));
  return rows.reduce((total, row) => total + (ids.has(row.id) ? row.revenue : 0), 0);
}
