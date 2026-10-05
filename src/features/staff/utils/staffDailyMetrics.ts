import type { AppointmentListItem } from "@/types/appointment";
import type { StaffMember } from "@/data/teamData";

export function getStaffDailyMetrics(member: StaffMember, appointments: AppointmentListItem[]) {
  const ids = new Set([member.id, member.userId, ...(member.staffIdAliases ?? [])].filter(Boolean));
  const seen = new Set<string>();
  let todayAppointments = 0;
  let servicesCompleted = 0;
  let revenueCents = 0;
  for (const appointment of appointments) {
    if (!ids.has(appointment.staffId) || seen.has(appointment.id)) continue;
    seen.add(appointment.id);
    if (["Cancelled", "Missed", "Deleted", "Unknown", "Expired"].includes(appointment.status)) continue;
    todayAppointments += 1;
    if (appointment.status === "Completed") servicesCompleted += 1;
    revenueCents += Math.round(Math.max(0, appointment.paidAmount) * 100);
  }
  return { todayAppointments, servicesCompleted, todayRevenue: revenueCents / 100 };
}
