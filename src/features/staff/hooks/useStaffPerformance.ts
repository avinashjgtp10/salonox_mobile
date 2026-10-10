import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";

import type { StaffMember } from "@/data/teamData";
import { getStaffDailyMetrics } from "@/features/staff/utils/staffDailyMetrics";
import { findStaffRevenue, getStaffRevenueRanges } from "@/features/staff/utils/staffRevenue";
import { useLocalDay } from "@/hooks/useLocalDay";
import { appointmentService } from "@/services/appointment.service";
import { attendanceService } from "@/services/attendance.service";
import { reportService } from "@/services/report.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import type { AppointmentListItem } from "@/types/appointment";
import type { AttendanceStatusKey } from "@/types/attendance";

export type PerformancePeriod = "today" | "week" | "month";

type DateRange = { end_date: string; start_date: string };

export type StaffPerformance = {
  appointments: number | null;
  completed: number | null;
  daysPresent: number | null;
  /** Today's attendance status (only for the "today" period). */
  todayStatus: AttendanceStatusKey | null;
  rating: { averageRating: number; totalReviews: number } | null;
  revenue: number | null;
};

export type StaffPerformanceErrors = Record<"appointments" | "attendance" | "rating" | "revenue", boolean>;

const PRESENT_STATUSES: AttendanceStatusKey[] = ["present", "late", "halfDay"];
const MAX_APPOINTMENT_PAGES = 30;

const fetchAppointmentsInRange = async (range: DateRange, branch: string | null) => {
  const appointments: AppointmentListItem[] = [];
  for (let page = 1; page <= MAX_APPOINTMENT_PAGES; page += 1) {
    const response = await appointmentService.getAppointments({
      end_date: range.end_date, limit: 100, page, search: "", sort_by: "scheduled_at", sort_order: "ASC", start_date: range.start_date,
    }, branch);
    appointments.push(...response.appointments);
    if (!response.pagination.hasMore || response.appointments.length === 0) return appointments;
  }
  return appointments;
};

/** Performance Metrics for one staff member over today / this week / this month. */
export function useStaffPerformance(member: StaffMember | null | undefined, period: PerformancePeriod) {
  const day = useLocalDay();
  const branch = useAppSelector(selectActiveBranchId);
  const range = useMemo<DateRange>(() => {
    const ranges = getStaffRevenueRanges(day);
    return period === "today" ? ranges.today : period === "week" ? ranges.weekly : ranges.monthly;
  }, [day, period]);
  const key = member ? JSON.stringify([member.id, branch, range]) : null;
  const generation = useRef(0);
  const [result, setResult] = useState<{ data: StaffPerformance; errors: StaffPerformanceErrors; key: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!member || !key) return;
    const request = ++generation.current;
    setLoading(true);
    // Each source is independent: one failing (e.g. no report permission) keeps the rest.
    const [appointments, revenue, attendance, rating] = await Promise.allSettled([
      fetchAppointmentsInRange(range, branch),
      reportService.getStaffPerformanceRevenue(range, true),
      attendanceService.getForStaff(member.id, { endDate: range.end_date, limit: 62, startDate: range.start_date }),
      reportService.getStaffRating([member.id], range),
    ]);
    if (request !== generation.current) return;

    const counts = appointments.status === "fulfilled" ? getStaffDailyMetrics(member, appointments.value) : null;
    const records = attendance.status === "fulfilled"
      ? attendance.value.records.filter((record) => record.date && record.date >= range.start_date && record.date <= range.end_date)
      : null;
    const daysPresent = records
      ? new Set(records.filter((record) => record.checkInTime || PRESENT_STATUSES.includes(record.statusKey)).map((record) => record.date)).size
      : null;
    const todayRecord = records?.find((record) => record.date === range.end_date) ?? null;

    setResult({
      data: {
        appointments: counts ? counts.todayAppointments : null,
        completed: counts ? counts.servicesCompleted : null,
        daysPresent,
        rating: rating.status === "fulfilled" ? rating.value : null,
        revenue: revenue.status === "fulfilled" ? findStaffRevenue(member, revenue.value) : null,
        todayStatus: period === "today" && records ? todayRecord?.statusKey ?? "notMarked" : null,
      },
      errors: {
        appointments: appointments.status === "rejected",
        attendance: attendance.status === "rejected",
        rating: rating.status === "rejected",
        revenue: revenue.status === "rejected",
      },
      key,
    });
    setLoading(false);
  }, [branch, key, member, period, range]);

  // Reload when the screen gains focus and whenever the staff member or period changes.
  useFocusEffect(useCallback(() => {
    void load();
    return () => { generation.current += 1; };
  }, [load]));

  const current = result?.key === key ? result : null;
  return { data: current?.data ?? null, errors: current?.errors ?? null, loading: loading || !current, range, refresh: load };
}
