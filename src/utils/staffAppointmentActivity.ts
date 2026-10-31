import type { StaffMember } from "@/data/teamData";
import { isAssignedToStaff, toComparableId } from "@/features/appointments/utils/staffAssignment";
import type { AppointmentListItem } from "@/types/appointment";
import type { NotificationItem } from "@/types/notification";
import { formatAppDate, parseAppDateTime } from "@/utils/dateTime";
import { maskClientName } from "@/utils/clientPrivacy";

const pad = (value: number) => String(value).padStart(2, "0");

// Same wording as the backend notifications owners (and the web) get:
// "New Appointment Booked" / "abcd — 31-10-2026 at 04:30 pm".
const getActivityTitle = (appointment: AppointmentListItem): string => {
  if (appointment.status === "Cancelled") return "Appointment Cancelled";
  if (appointment.status === "Completed") return "Appointment Completed";
  if (appointment.status === "No Show") return "Appointment No Show";
  const created = Date.parse(appointment.raw.created_at ?? appointment.createdAt ?? "");
  const updated = Date.parse(appointment.raw.updated_at ?? "");
  // Saving a booking can stamp updated_at a moment after created_at.
  return updated - created > 60_000 ? "Appointment Updated" : "New Appointment Booked";
};

const getActivityBody = (appointment: AppointmentListItem): string => {
  const date = parseAppDateTime(appointment.scheduledAt);
  const when = date
    ? `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} at ${pad(date.getHours() % 12 || 12)}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? "pm" : "am"}`
    : "";
  const name = appointment.clientName?.trim() ? maskClientName(appointment.clientName) : "Walk-in";
  return when ? `${name} — ${when}` : name;
};

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
      title: getActivityTitle(appointment),
      body: getActivityBody(appointment),
      referenceId: appointment.id,
      recipientUserIds: [userId],
      createdAt,
      createdDateLabel: formatAppDate(createdAt, ""),
      isRead: read.has(id),
    }];
  }).sort((left, right) => (Date.parse(right.createdAt ?? "") || 0) - (Date.parse(left.createdAt ?? "") || 0));
};
