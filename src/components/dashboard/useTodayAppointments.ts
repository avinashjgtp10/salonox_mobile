/**
 * Today's appointments for the dashboard: the next upcoming / in-progress ones first,
 * then today's completed ones (logic unchanged from the previous AppointmentsList).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { appointmentService } from "@/services/appointment.service";
import { selectAppointments } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { AppointmentListItem, AppointmentStatus as CalendarAppointmentStatus } from "@/types/appointment";
import { salonDateKey } from "@/utils/salonRegion";
import { selectSalonTimezone } from "@/store/salon/region.selectors";
import { useSalonDay } from "@/hooks/useSalonDay";

export type DashboardAppointmentStatus = "completed" | "in-progress" | "upcoming";

export type DashboardAppointmentCard = {
  amount: number;
  clientName: string;
  id: string;
  service: string;
  staffName: string;
  status: DashboardAppointmentStatus;
  time: string;
};

const ACTIVE_APPOINTMENT_STATUSES = new Set<CalendarAppointmentStatus>([
  "Checked In",
  "Confirmed",
  "In Progress",
  "In Service",
  "Upcoming",
]);

const toStrictIsoDateTime = (value: string) => {
  let normalized = value.trim();
  if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
  normalized = normalized.replace(/(T\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})$/, "$1$2:00");
  if (normalized.includes("T") && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) normalized += "Z";
  return normalized;
};

const parseApiDateTime = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsedDate = new Date(toStrictIsoDateTime(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getAppointmentStartMs = (appointment: AppointmentListItem) =>
  parseApiDateTime(appointment.startTime ?? appointment.scheduledAt)?.getTime() ?? null;

const getAppointmentCompletionMs = (appointment: AppointmentListItem) =>
  parseApiDateTime(appointment.raw.completed_at)?.getTime()
  ?? parseApiDateTime(appointment.endTime)?.getTime()
  ?? getAppointmentStartMs(appointment);

const getAppointmentDateKey = (appointment: AppointmentListItem, timezone: string) => {
  const rawStart = appointment.startTime ?? appointment.scheduledAt;
  const parsedDate = parseApiDateTime(rawStart);
  if (!parsedDate) return rawStart ? rawStart.slice(0, 10) : "";
  return salonDateKey(parsedDate, timezone);
};

const formatAppointmentTime = (appointment: AppointmentListItem, timezone: string) => {
  const parsedDate = parseApiDateTime(appointment.startTime ?? appointment.scheduledAt);
  return parsedDate ? parsedDate.toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true }) : "--:--";
};

const toDashboardAppointmentStatus = (appointment: AppointmentListItem): DashboardAppointmentStatus | null => {
  if (ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)) {
    return ["Checked In", "In Progress", "In Service"].includes(appointment.status) ? "in-progress" : "upcoming";
  }
  if (appointment.status === "Completed") return "completed";
  return null;
};

const toCardModel = (appointment: AppointmentListItem, status: DashboardAppointmentStatus, timezone: string): DashboardAppointmentCard => ({
  amount: appointment.total || appointment.amount,
  clientName: appointment.clientName,
  id: appointment.id,
  service: appointment.serviceName,
  staffName: appointment.staffName,
  status,
  time: formatAppointmentTime(appointment, timezone),
});

/** `refreshKey` changes on a manual pull-to-refresh; there is no refresh on focus. */
export function useTodayAppointments(refreshKey = 0) {
  const timezone = useAppSelector(selectSalonTimezone);
  const todayKey = useSalonDay();
  const appointments = useAppSelector(selectAppointments);
  const currentUser = useAppSelector(selectCurrentUser);
  const [completedRawAppointments, setCompletedRawAppointments] = useState<AppointmentListItem[]>([]);

  const fetchCompletedAppointments = useCallback(() => {
    let isCancelled = false;
    appointmentService
      .getAppointments(
        { limit: 100, page: 1, search: "", sort_by: "scheduled_at", sort_order: "DESC", status: "paid" },
        currentUser?.salonId,
      )
      .then((response) => { if (!isCancelled) setCompletedRawAppointments(response.appointments); })
      .catch(() => { if (!isCancelled) setCompletedRawAppointments([]); });
    return () => { isCancelled = true; };
  }, [currentUser?.salonId]);

  useEffect(() => fetchCompletedAppointments(), [fetchCompletedAppointments, refreshKey]);

  const upcomingAppointments = useMemo(() => {
    const nowMs = Date.now();
    return appointments
      .filter((appointment) => getAppointmentDateKey(appointment, timezone) === todayKey)
      .map((appointment) => ({ appointment, scheduledAtMs: getAppointmentStartMs(appointment), status: toDashboardAppointmentStatus(appointment) }))
      .filter(({ scheduledAtMs, status }) => {
        if (!status || status === "completed") return false;
        return status === "in-progress" || scheduledAtMs === null || scheduledAtMs > nowMs;
      })
      .sort((left, right) => (left.scheduledAtMs ?? Infinity) - (right.scheduledAtMs ?? Infinity))
      .slice(0, 3)
      .map(({ appointment, status }) => toCardModel(appointment, status ?? "upcoming", timezone));
  }, [appointments, todayKey, timezone]);

  const completedAppointments = useMemo(() => {
    return completedRawAppointments
      .filter((appointment) => appointment.status === "Completed")
      .filter((appointment) => getAppointmentDateKey(appointment, timezone) === todayKey)
      .map((appointment) => ({ appointment, completedAtMs: getAppointmentCompletionMs(appointment) }))
      .sort((left, right) => (right.completedAtMs ?? -Infinity) - (left.completedAtMs ?? -Infinity))
      .slice(0, 3)
      .map(({ appointment }) => toCardModel(appointment, "completed", timezone));
  }, [completedRawAppointments, todayKey, timezone]);

  return useMemo(
    () => [...upcomingAppointments, ...completedAppointments].slice(0, 5),
    [completedAppointments, upcomingAppointments],
  );
}
