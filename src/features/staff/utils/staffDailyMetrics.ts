import type { AppointmentListItem } from "@/types/appointment";
import type { StaffMember } from "@/data/teamData";

// Count participation from each service, including multi-staff bookings.
// Revenue comes from the backend Staff Performance report separately.
function getStaffIds(appointment: AppointmentListItem) {
  const services = Array.isArray(appointment.raw?.services) ? appointment.raw.services : [];
  const ids = new Set<string>();
  for (const service of services) {
    const staffId = String(service?.staff_id ?? "").trim() || appointment.staffId;
    if (!staffId) continue;
    ids.add(staffId);
  }
  if (ids.size === 0 && appointment.staffId) ids.add(appointment.staffId);
  return ids;
}

export function getStaffDailyMetrics(member: StaffMember, appointments: AppointmentListItem[]) {
  const ids = new Set([member.id, member.userId, ...(member.staffIdAliases ?? [])].filter(Boolean));
  const seen = new Set<string>();
  let todayAppointments = 0;
  let servicesCompleted = 0;
  for (const appointment of appointments) {
    if (seen.has(appointment.id)) continue;
    const memberIds = [...getStaffIds(appointment)].filter((staffId) => ids.has(staffId));
    if (memberIds.length === 0) continue;
    seen.add(appointment.id);
    if (["Cancelled", "Missed", "Deleted", "Unknown", "Expired"].includes(appointment.status)) continue;
    todayAppointments += 1;
    if (appointment.status === "Completed") servicesCompleted += 1;
  }
  return { todayAppointments, servicesCompleted };
}
