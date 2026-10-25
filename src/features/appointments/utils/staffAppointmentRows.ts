import type { AppointmentListItem } from "@/types/appointment";

import { getDateKey } from "./appointmentDateTime";
import { sortWithActiveFirst } from "./appointmentList";
import { getJobCardStatus } from "./jobCard";

export type StaffAppointmentRow =
  | { id: string; title: string; type: "section" }
  | { appointment: AppointmentListItem; id: string; type: "appointment" };

export const isSameDay = (appointment: AppointmentListItem, date: string) =>
  getDateKey(appointment.scheduledAt) === date;

/** Done for the staff side: paid/completed, or every job card service finished. */
export const isStaffAppointmentCompleted = (appointment: AppointmentListItem) =>
  appointment.status === "Completed" || getJobCardStatus(appointment) === "Completed";

export const buildStaffAppointmentRows = (
  appointments: AppointmentListItem[],
  today: string,
): StaffAppointmentRow[] => {
  const todayAppointments = appointments.filter((appointment) => isSameDay(appointment, today));
  const otherDays = appointments.filter((appointment) => !isSameDay(appointment, today) && appointment.status !== "Deleted");
  const completedAppointments = otherDays.filter(
    (appointment) => appointment.status !== "Cancelled" && isStaffAppointmentCompleted(appointment),
  );
  const cancelledAppointments = otherDays.filter((appointment) => appointment.status === "Cancelled");
  const openAppointments = otherDays.filter(
    (appointment) => appointment.status !== "Cancelled" && !isStaffAppointmentCompleted(appointment),
  );
  const noShowAppointments = openAppointments.filter((appointment) => appointment.status === "No Show");
  const pendingAppointments = openAppointments.filter((appointment) => appointment.status !== "No Show");
  const rows: StaffAppointmentRow[] = [];
  const addSection = (title: string, sectionAppointments: AppointmentListItem[]) => {
    if (sectionAppointments.length === 0) {
      return;
    }

    rows.push({ id: `section-${title}`, title, type: "section" });
    rows.push(
      ...sectionAppointments.sort(sortWithActiveFirst).map((appointment) => ({
        appointment,
        id: appointment.id,
        type: "appointment" as const,
      })),
    );
  };

  addSection("Today's Appointments", todayAppointments);
  addSection("Pending Appointments", pendingAppointments);
  addSection("No-Show Appointments", noShowAppointments);
  addSection("Completed Appointments", completedAppointments);
  addSection("Cancelled Appointments", cancelledAppointments);

  return rows;
};
