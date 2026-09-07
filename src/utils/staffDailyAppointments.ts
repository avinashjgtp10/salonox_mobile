import type { StaffMember } from "@/data/teamData";
import type { DashboardAppointment } from "@/services/dashboard.service";

const INCLUDED_STATUSES = new Set(["upcoming", "in-progress", "partial", "completed"]);
const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export function countStaffDailyAppointments(
  member: StaffMember,
  staff: StaffMember[],
  appointments: DashboardAppointment[],
  requestedDate: string | null,
  today: string,
): number {
  // Never show yesterday's cached count while the new day's request is loading.
  if (requestedDate !== today) return 0;
  const ids = new Set([member.id, member.userId, ...(member.staffIdAliases ?? [])].filter(Boolean));
  const name = normalizeName(member.name);
  const uniqueName = name && staff.filter((item) => normalizeName(item.name) === name).length === 1;
  const matchingIds = new Set<string>();
  for (const appointment of appointments) {
    if (!INCLUDED_STATUSES.has(appointment.status)) continue;
    // Old server versions may omit IDs. Only use an exact, unambiguous name then.
    const matches = appointment.staffId
      ? ids.has(appointment.staffId)
      : uniqueName && normalizeName(appointment.staffName) === name;
    if (matches) matchingIds.add(appointment.id);
  }
  return matchingIds.size;
}
