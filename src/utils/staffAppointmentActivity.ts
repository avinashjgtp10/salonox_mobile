import type { StaffMember } from "@/data/teamData";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import type { AppointmentListItem } from "@/types/appointment";
import type { NotificationItem } from "@/types/notification";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";

// Personal activity is built from appointments the existing API lets this
// user read. It does not depend on salon notification recipient metadata.
export const buildStaffAppointmentActivity = (
  appointments: AppointmentListItem[],
  staff: StaffMember,
  userId: string,
  readIds: string[],
): NotificationItem[] => {
  const read = new Set(readIds);
  return appointments.filter(appointment => isAssignedToStaff(appointment, staff)).map(appointment => {
    const createdAt = appointment.raw.updated_at ?? appointment.createdAt ?? appointment.scheduledAt;
    const id = `staff-appointment:${JSON.stringify([appointment.id, appointment.status, appointment.scheduledAt, createdAt])}`;
    return {
      id,
      type: "appointment",
      title: `Your appointment · ${appointment.status}`,
      body: `${appointment.clientName} — ${appointment.serviceName}, ${formatAppDate(appointment.scheduledAt, "")} ${formatAppTime(appointment.scheduledAt, "")}`,
      referenceId: appointment.id,
      recipientUserIds: [userId],
      createdAt,
      createdDateLabel: formatAppDate(createdAt, ""),
      isRead: read.has(id),
    };
  }).sort((left, right) => (Date.parse(right.createdAt ?? "") || 0) - (Date.parse(left.createdAt ?? "") || 0));
};
