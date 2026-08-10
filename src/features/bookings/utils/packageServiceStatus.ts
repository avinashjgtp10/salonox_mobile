import { isPackageExpired } from "./packageStatus";
import type { ClientPackageServiceScheduleSlot } from "../../../services/api/endpoints/packages.endpoints";

export type PackageServiceDisplayStatus =
  | "Not Scheduled"
  | "Scheduled"
  | "Completed"
  | "Cancelled"
  | "No Show"
  | "Expired";

export interface PackageServiceDisplayInfo {
  status: PackageServiceDisplayStatus;
  scheduledAt?: string | null;
  staffName?: string | null;
}

// Derived, never stored — mirrors how package expiry itself is computed
// client-side (see packageStatus.ts). A service line is only ever "Not
// Scheduled"/"Scheduled"/"Completed"/"Cancelled"/"No Show"/"Expired" at
// display time; the backend only stores per-slot Scheduled/Completed/
// Cancelled/No Show rows in scheduleSlots.
export function getPackageServiceDisplayStatus(
  service: {
    totalSessions: number;
    completedSessions: number;
    scheduleSlots: ClientPackageServiceScheduleSlot[];
  },
  packageExpiryDate: string | null | undefined,
): PackageServiceDisplayInfo {
  if (service.completedSessions >= service.totalSessions) {
    return { status: "Completed" };
  }

  // An active reservation always wins — it's what staff/client care about
  // right now, even if this service was cancelled or no-showed earlier.
  const active = [...service.scheduleSlots]
    .filter((s) => s.status === "Scheduled")
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime())[0];
  if (active) {
    return { status: "Scheduled", scheduledAt: active.scheduledAt, staffName: active.staffName };
  }

  // No active reservation — surface the most recent terminal event (so
  // "Cancelled"/"No Show" stay visible, distinct from a service that was
  // simply never booked) until the service is rescheduled.
  const latestTerminal = [...service.scheduleSlots]
    .filter((s) => s.status === "Cancelled" || s.status === "No Show")
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime())[0];
  if (latestTerminal) {
    return { status: latestTerminal.status, scheduledAt: latestTerminal.scheduledAt, staffName: latestTerminal.staffName };
  }

  if (isPackageExpired(packageExpiryDate)) {
    return { status: "Expired" };
  }

  return { status: "Not Scheduled" };
}
