import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import type { StaffMember } from "@/data/teamData";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import { getTodayAttendanceDateKey } from "@/features/attendance/utils/attendanceStatus";
import { useAppForeground } from "@/hooks/useAppForeground";
import { fetchAttendanceOverviewThunk } from "@/middleware/attendance/attendance.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import {
  selectAttendanceCheckingInStaffIds,
  selectAttendanceCheckingOutStaffIds,
  selectAttendanceDate,
  selectAttendanceIsInitialLoading,
  selectAttendanceRecords,
  selectAttendanceRecordsError,
  selectAttendanceRecordsRefreshing,
  selectAttendanceSummary,
} from "@/store/attendance/attendance.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectStaffLoading, selectStaffMembers } from "@/store/staff/staff.slice";
import type { AttendanceRecord } from "@/types/attendance";

export type AttendanceStaffRowData = {
  record: AttendanceRecord | null;
  staffMember: StaffMember;
};

// Orchestrates the Manual Attendance screen's data: joins the live staff
// roster against today's attendance records (same multi-identifier matching
// used by the dashboard's Staff Workload widget), and exposes a single
// refresh entry point that re-fetches both so the list, summary cards, and
// the dashboard widget (which reads the same slice) all stay in sync.
export const useAttendanceScreen = () => {
  const dispatch = useAppDispatch();

  const rawStaffMembers = useAppSelector(selectStaffMembers);
  const staffLoading = useAppSelector(selectStaffLoading);
  const attendanceRecords = useAppSelector(selectAttendanceRecords);
  const summary = useAppSelector(selectAttendanceSummary);
  // GET /attendance/today's own `date` (backend-computed, IST) is the real
  // "today" this screen is showing; fall back to a locally-computed IST date
  // only until that first response lands, so Manual Mark's required `date`
  // field is never undefined.
  const backendDate = useAppSelector(selectAttendanceDate);
  const attendanceDate = backendDate || getTodayAttendanceDateKey();
  const isInitialLoading = useAppSelector(selectAttendanceIsInitialLoading);
  const recordsError = useAppSelector(selectAttendanceRecordsError);
  const recordsRefreshing = useAppSelector(selectAttendanceRecordsRefreshing);
  const checkingInStaffIds = useAppSelector(selectAttendanceCheckingInStaffIds);
  const checkingOutStaffIds = useAppSelector(selectAttendanceCheckingOutStaffIds);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    await Promise.all([
      dispatch(fetchAttendanceOverviewThunk()),
      dispatch(fetchStaffThunk({ reset: true })),
    ]);
  }, [dispatch]);

  // Fires on initial mount and every time the screen regains focus (e.g.
  // navigating back from a staff detail screen), so data never goes stale
  // just because the user stepped away and came back.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useAppForeground(() => {
    void refresh();
  });

  const handlePullToRefresh = useCallback(async () => {
    setIsManualRefreshing(true);

    try {
      await refresh();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refresh]);

  const activeStaffMembers = useMemo(
    () => rawStaffMembers.filter((member) => member.status !== "Inactive"),
    [rawStaffMembers],
  );

  const rows = useMemo<AttendanceStaffRowData[]>(
    () =>
      activeStaffMembers.map((staffMember) => ({
        record: findAttendanceRecordForStaff(attendanceRecords, staffMember) ?? null,
        staffMember,
      })),
    [activeStaffMembers, attendanceRecords],
  );

  const isStaffBusy = useCallback(
    (staffId: string) => checkingInStaffIds.includes(staffId) || checkingOutStaffIds.includes(staffId),
    [checkingInStaffIds, checkingOutStaffIds],
  );

  return {
    attendanceDate,
    handlePullToRefresh,
    isInitialLoading: isInitialLoading || (staffLoading && activeStaffMembers.length === 0),
    isRefreshing: isManualRefreshing || recordsRefreshing,
    isStaffBusy,
    recordsError,
    refresh,
    rows,
    summary,
  };
};
