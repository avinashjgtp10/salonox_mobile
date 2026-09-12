import { appointmentStatusMatchesFilter } from "@/services/appointment.service";
import type { AppointmentStatus } from "@/types/appointment";

/** Empty selection represents All; never store All alongside individual statuses. */
export function toggleCalendarStatus(selected: AppointmentStatus[], status: "All" | AppointmentStatus): AppointmentStatus[] {
  if (status === "All") return [];
  return selected.includes(status) ? selected.filter((item) => item !== status) : [...selected, status];
}

export function matchesCalendarStatuses(status: AppointmentStatus, selected: AppointmentStatus[]): boolean {
  if (selected.length === 0) return status !== "Unknown";
  return selected.some((filter) => filter === "Deleted" ? status === "Deleted" : appointmentStatusMatchesFilter(status, filter));
}
