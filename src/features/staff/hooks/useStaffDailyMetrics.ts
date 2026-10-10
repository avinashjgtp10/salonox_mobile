import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import type { StaffMember } from "@/data/teamData";
import { useLocalDay } from "@/hooks/useLocalDay";
import { useAppForeground } from "@/hooks/useAppForeground";
import { appointmentService } from "@/services/appointment.service";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type { AppointmentListItem } from "@/types/appointment";
import { getStaffDailyMetrics } from "@/features/staff/utils/staffDailyMetrics";
import { reportService } from "@/services/report.service";
import { getStaffRevenueRanges, findStaffRevenue } from "@/features/staff/utils/staffRevenue";

export function useStaffDailyMetrics(staff: StaffMember[], includeHistory = false) {
  const day = useLocalDay();
  const branch = useAppSelector(selectActiveBranchId);
  const focused = useIsFocused();
  const generation = useRef(0);
  const [result, setResult] = useState<{ scope: string; appointments: AppointmentListItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revenueResult, setRevenueResult] = useState<{
    scope: string;
    today: Awaited<ReturnType<typeof reportService.getStaffPerformanceRevenue>>;
    weekly: Awaited<ReturnType<typeof reportService.getStaffPerformanceRevenue>>;
    monthly: Awaited<ReturnType<typeof reportService.getStaffPerformanceRevenue>>;
  } | null>(null);
  const [revenueError, setRevenueError] = useState(false);
  const scope = JSON.stringify([day, branch, includeHistory]);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(false);
    setRevenueError(false);
    const ranges = getStaffRevenueRanges(day);
    const revenueRequest = Promise.all([
      reportService.getStaffPerformanceRevenue(ranges.today, true),
      includeHistory ? reportService.getStaffPerformanceRevenue(ranges.weekly, true) : Promise.resolve([]),
      includeHistory ? reportService.getStaffPerformanceRevenue(ranges.monthly, true) : Promise.resolve([]),
    ]).then(([today, weekly, monthly]) => {
      if (request === generation.current) setRevenueResult({ scope, today, weekly, monthly });
    }).catch(() => {
      if (request === generation.current) {
        setRevenueResult(null);
        setRevenueError(true);
      }
    });
    try {
      const appointments: AppointmentListItem[] = [];
      let page = 1;
      while (true) {
        const response = await appointmentService.getAppointments({
          date: day, page, limit: 100, search: "", sort_by: "scheduled_at", sort_order: "ASC",
        }, branch);
        if (request !== generation.current) return;
        appointments.push(...response.appointments);
        if (!response.pagination.hasMore) break;
        if (response.pagination.nextPage <= page || response.appointments.length === 0) {
          throw new Error("Incomplete appointment pagination");
        }
        page = response.pagination.nextPage;
      }
      setResult({ scope, appointments });
    } catch {
      if (request === generation.current) {
        setResult(null);
        setError(true);
      }
    } finally {
      await revenueRequest;
      if (request === generation.current) setLoading(false);
    }
  }, [branch, day, scope, includeHistory]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]));
  useAppForeground(() => { if (focused) void refresh(); });
  const ready = result?.scope === scope;
  const revenueReady = revenueResult?.scope === scope;
  const members = useMemo(() => staff.map((member) => ({
    ...member,
    ...getStaffDailyMetrics(member, ready ? result.appointments : []),
    todayRevenue: findStaffRevenue(member, revenueReady ? revenueResult.today : []),
    weeklyRevenue: findStaffRevenue(member, revenueReady ? revenueResult.weekly : []),
    monthlyRevenue: findStaffRevenue(member, revenueReady ? revenueResult.monthly : []),
  })), [staff, ready, result, revenueReady, revenueResult]);
  return { members, ready, revenueReady, loading, error, revenueError, refresh };
}
