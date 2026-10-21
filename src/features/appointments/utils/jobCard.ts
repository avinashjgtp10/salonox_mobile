import type { AppointmentBilledItem, AppointmentListItem } from "@/types/appointment";

export type JobCardStatus = "Pending" | "In Progress" | "Completed";

// Rows a staff member performs and tracks on the job card, in the order the
// client moves through them (services, packages, memberships) — the same
// order the backend uses to decide whether a row is ready to start.
const JOB_CARD_TYPES = new Set<AppointmentBilledItem["type"]>(["service", "package", "membership"]);

export const getJobCardItems = (appointment: AppointmentListItem) =>
  appointment.billedItems.filter((item) => JOB_CARD_TYPES.has(item.type));

/**
 * The earliest unfinished row owned by a different staff member that comes
 * before items[index], or null when items[index] is ready to start. Mirrors
 * the backend's own check; unassigned rows never block.
 */
export const getJobCardBlocker = (items: AppointmentBilledItem[], index: number): AppointmentBilledItem | null => {
  const item = items[index];
  if (!item) return null;

  return items.slice(0, index).find((earlier) =>
    earlier.staffId && earlier.staffId !== item.staffId && earlier.status !== "completed") ?? null;
};

/** An appointment's job is Completed only once every job card row is completed. */
export const getJobCardStatus = (appointment: AppointmentListItem): JobCardStatus => {
  const items = getJobCardItems(appointment);

  if (items.length > 0 && items.every((item) => item.status === "completed")) return "Completed";
  if (items.some((item) => item.status === "in_progress" || item.status === "completed")) return "In Progress";
  return "Pending";
};
