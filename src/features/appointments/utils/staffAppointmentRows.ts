import type { AppointmentListItem } from "@/types/appointment";

import { getDateKey } from "./appointmentDateTime";
import { ACTIVE_APPOINTMENT_STATUSES, sortWithActiveFirst } from "./appointmentList";

export type StaffAppointmentRow =
  | { id: string; title: string; type: "section" }
  | { appointment: AppointmentListItem; id: string; type: "appointment" };

export const isSameDay = (appointment: AppointmentListItem, date: string) =>
  getDateKey(appointment.scheduledAt) === date;

export const buildStaffAppointmentRows = (
  appointments: AppointmentListItem[],
  today: string,
): StaffAppointmentRow[] => {
  const todayAppointments = appointments.filter((appointment) => isSameDay(appointment, today));
  const upcomingAppointments = appointments.filter(
    (appointment) => !isSameDay(appointment, today) && ACTIVE_APPOINTMENT_STATUSES.has(appointment.status),
  );
  const completedAppointments = appointments.filter(
    (appointment) => !isSameDay(appointment, today) && appointment.status === "Completed",
  );
  const cancelledAppointments = appointments.filter(
    (appointment) => !isSameDay(appointment, today) && appointment.status === "Cancelled",
  );
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
  addSection("Upcoming Appointments", upcomingAppointments);
  addSection("Completed Appointments", completedAppointments);
  addSection("Cancelled Appointments", cancelledAppointments);

  return rows;
};
