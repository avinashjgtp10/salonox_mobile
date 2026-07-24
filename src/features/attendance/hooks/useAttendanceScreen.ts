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

const shiftDate = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
  const isInitialLoading = useAppSelector(selectAttendanceIsInitialLoading);
  const recordsError = useAppSelector(selectAttendanceRecordsError);
  const recordsRefreshing = useAppSelector(selectAttendanceRecordsRefreshing);
  const checkingInStaffIds = useAppSelector(selectAttendanceCheckingInStaffIds);
  const checkingOutStaffIds = useAppSelector(selectAttendanceCheckingOutStaffIds);

  const [selectedDate, setSelectedDate] = useState(getTodayAttendanceDateKey);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    await Promise.all([
      dispatch(fetchAttendanceOverviewThunk(selectedDate)),
      dispatch(fetchStaffThunk({ reset: true })),
    ]);
  }, [dispatch, selectedDate]);

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

  const filteredStaffMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return activeStaffMembers;
    }

    return activeStaffMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query),
    );
  }, [activeStaffMembers, search]);

  const rows = useMemo<AttendanceStaffRowData[]>(
    () =>
      filteredStaffMembers.map((staffMember) => ({
        record: findAttendanceRecordForStaff(attendanceRecords, staffMember) ?? null,
        staffMember,
      })),
    [attendanceRecords, filteredStaffMembers],
  );

  const isStaffBusy = useCallback(
    (staffId: string) => checkingInStaffIds.includes(staffId) || checkingOutStaffIds.includes(staffId),
    [checkingInStaffIds, checkingOutStaffIds],
  );

  return {
    handlePullToRefresh,
    isInitialLoading: isInitialLoading || (staffLoading && activeStaffMembers.length === 0),
    isRefreshing: isManualRefreshing || recordsRefreshing,
    isStaffBusy,
    isTodaySelected: selectedDate >= getTodayAttendanceDateKey(),
    onNextDay: () => setSelectedDate((date) => shiftDate(date, 1)),
    onPreviousDay: () => setSelectedDate((date) => shiftDate(date, -1)),
    onSearchChange: setSearch,
    onSelectDate: setSelectedDate,
    onToday: () => setSelectedDate(getTodayAttendanceDateKey()),
    recordsError,
    refresh,
    rows,
    search,
    selectedDate,
    summary,
  };
};
