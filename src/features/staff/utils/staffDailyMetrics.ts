import type { AppointmentListItem } from "@/types/appointment";
import type { StaffMember } from "@/data/teamData";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Each staff's share of an appointment, weighted by the value of the services
// they performed (evenly when every service is zero-priced). The appointment's
// own staffId is only its first service's staff, so attributing the whole
// paid amount to it left every other staff on a multi-staff booking at ₹0.
function getStaffShares(appointment: AppointmentListItem) {
  const services = Array.isArray(appointment.raw?.services) ? appointment.raw.services : [];
  const value = new Map<string, number>();
  const count = new Map<string, number>();
  for (const service of services) {
    const staffId = String(service?.staff_id ?? "").trim() || appointment.staffId;
    if (!staffId) continue;
    const quantity = toNumber(service.quantity ?? service.qty) || 1;
    const serviceValue = Math.max(0, toNumber(service.total) || toNumber(service.price) * quantity);
    value.set(staffId, (value.get(staffId) ?? 0) + serviceValue);
    count.set(staffId, (count.get(staffId) ?? 0) + 1);
  }
  if (count.size === 0 && appointment.staffId) {
    value.set(appointment.staffId, 0);
    count.set(appointment.staffId, 1);
  }
  const sum = (map: Map<string, number>) => [...map.values()].reduce((total, entry) => total + entry, 0);
  return { value, count, totalValue: sum(value), totalCount: sum(count) };
}

export function getStaffDailyMetrics(member: StaffMember, appointments: AppointmentListItem[]) {
  const ids = new Set([member.id, member.userId, ...(member.staffIdAliases ?? [])].filter(Boolean));
  const seen = new Set<string>();
  let todayAppointments = 0;
  let servicesCompleted = 0;
  let revenueCents = 0;
  for (const appointment of appointments) {
    if (seen.has(appointment.id)) continue;
    const shares = getStaffShares(appointment);
    const memberIds = [...shares.count.keys()].filter((staffId) => ids.has(staffId));
    if (memberIds.length === 0) continue;
    seen.add(appointment.id);
    if (["Cancelled", "Missed", "Deleted", "Unknown", "Expired"].includes(appointment.status)) continue;
    todayAppointments += 1;
    if (appointment.status === "Completed") servicesCompleted += 1;
    const memberValue = memberIds.reduce((total, staffId) => total + (shares.value.get(staffId) ?? 0), 0);
    const memberCount = memberIds.reduce((total, staffId) => total + (shares.count.get(staffId) ?? 0), 0);
    const share = shares.totalValue > 0 ? memberValue / shares.totalValue : memberCount / shares.totalCount;
    revenueCents += Math.round(Math.max(0, appointment.paidAmount) * share * 100);
  }
  return { todayAppointments, servicesCompleted, todayRevenue: revenueCents / 100 };
}
