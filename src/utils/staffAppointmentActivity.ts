import type { StaffMember } from "@/data/teamData";
import { isAssignedToStaff, toComparableId } from "@/features/appointments/utils/staffAssignment";
import type { AppointmentListItem } from "@/types/appointment";
import type { NotificationItem } from "@/types/notification";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { getAppointmentBillLabel, maskClientName } from "@/utils/clientPrivacy";

// Service assignments take precedence over the bill's primary staff member.
// Only legacy appointments without service assignments may use the bill owner.
const getStaffServiceNames = (appointment: AppointmentListItem, staff: StaffMember): string[] => {
  const services = appointment.raw.services?.length
    ? appointment.raw.services
    : typeof appointment.raw.service === "object" && appointment.raw.service
      ? [appointment.raw.service]
      : [];
  const staffIds = new Set([staff.id, staff.userId, staff.employeeCode, ...(staff.staffIdAliases ?? [])]
    .map(toComparableId).filter((id): id is string => id !== null));
  if (services.some(service => toComparableId(service.staff_id) !== null)) {
    return services.filter(service => {
      const id = toComparableId(service.staff_id);
      return id !== null && staffIds.has(id);
    }).map(service => service.name?.trim() || service.title?.trim() || "Service");
  }
  if (!isAssignedToStaff(appointment, staff)) return [];
  return services.length
    ? services.map(service => service.name?.trim() || service.title?.trim() || "Service")
    : [appointment.serviceName];
};

export const buildStaffAppointmentActivity = (
  appointments: AppointmentListItem[],
  staff: StaffMember,
  userId: string,
  readIds: string[],
): NotificationItem[] => {
  const read = new Set(readIds);
  return appointments.flatMap(appointment => {
    const serviceNames = getStaffServiceNames(appointment, staff);
    if (!serviceNames.length) return [];
    const createdAt = appointment.raw.updated_at ?? appointment.createdAt ?? appointment.scheduledAt;
    const id = `staff-appointment:${JSON.stringify([appointment.id, appointment.status, appointment.scheduledAt, createdAt])}`;
    return [{
      id,
      type: "appointment",
      title: `${getAppointmentBillLabel(appointment)} · ${appointment.status}`,
      body: `${maskClientName(appointment.clientName)} — ${serviceNames.join(", ")}, ${formatAppDate(appointment.scheduledAt, "")} ${formatAppTime(appointment.scheduledAt, "")}`,
      referenceId: appointment.id,
      recipientUserIds: [userId],
      createdAt,
      createdDateLabel: formatAppDate(createdAt, ""),
      isRead: read.has(id),
    }];
  }).sort((left, right) => (Date.parse(right.createdAt ?? "") || 0) - (Date.parse(left.createdAt ?? "") || 0));
};
