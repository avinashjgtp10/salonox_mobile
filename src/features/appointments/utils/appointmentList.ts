import { appointmentStatusMatchesFilter } from "@/services/appointment.service";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";

import { parseAppointmentDateTime } from "./appointmentDateTime";

export const ACTIVE_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
]);

export const matchesAppointment = (
  appointment: AppointmentListItem,
  search: string,
  status: "All" | AppointmentStatus,
) => {
  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");

  if (!appointmentStatusMatchesFilter(appointment.status, status)) {
    return false;
  }

  if (!query) {
    return true;
  }

  return (
    appointment.clientName.toLowerCase().includes(query) ||
    appointment.serviceName.toLowerCase().includes(query) ||
    appointment.staffName.toLowerCase().includes(query) ||
    appointment.title.toLowerCase().includes(query) ||
    (digits.length > 0 && appointment.phone.includes(digits))
  );
};

export const sortBySchedule = (left: AppointmentListItem, right: AppointmentListItem) => {
  const leftTime = parseAppointmentDateTime(left.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = parseAppointmentDateTime(right.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
};

export const sortWithActiveFirst = (left: AppointmentListItem, right: AppointmentListItem) => {
  const leftIsActive = ACTIVE_APPOINTMENT_STATUSES.has(left.status);
  const rightIsActive = ACTIVE_APPOINTMENT_STATUSES.has(right.status);

  if (leftIsActive !== rightIsActive) {
    return leftIsActive ? -1 : 1;
  }

  return sortBySchedule(left, right);
};
