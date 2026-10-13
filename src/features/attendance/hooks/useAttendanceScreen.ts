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
import { useStaffLeaveStatus } from "@/features/staff/hooks/useStaffLeaveStatus";
import { applyApprovedLeaveToAttendance, applyApprovedLeaveToSummary } from "../utils/approvedLeaveAttendance";

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
  const leaveStatus = useStaffLeaveStatus(rawStaffMembers, selectedDate);
  const refreshLeaves = leaveStatus.refresh;

  const refresh = useCallback(async (includeLeaves = true) => {
    await Promise.all([
      dispatch(fetchAttendanceOverviewThunk(selectedDate)),
      dispatch(fetchStaffThunk({ reset: true })),
      includeLeaves ? refreshLeaves() : Promise.resolve(),
    ]);
  }, [dispatch, selectedDate, refreshLeaves]);

  useFocusEffect(
    useCallback(() => {
      void refresh(false);
    }, [refresh]),
  );

  useAppForeground(() => {
    void refresh(false);
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
      })).map(row => ({ ...row, record: applyApprovedLeaveToAttendance(row.record, row.staffMember, selectedDate, leaveStatus.approvedLeaves[row.staffMember.id]) })),
    [attendanceRecords, filteredStaffMembers, selectedDate, leaveStatus.approvedLeaves],
  );

  const isStaffBusy = useCallback(
    (staffId: string) => checkingInStaffIds.includes(staffId) || checkingOutStaffIds.includes(staffId),
    [checkingInStaffIds, checkingOutStaffIds],
  );

  return {
    handlePullToRefresh,
    isInitialLoading: isInitialLoading || (staffLoading && activeStaffMembers.length === 0),
    isRefreshing: isManualRefreshing || recordsRefreshing || leaveStatus.loading,
    isStaffBusy,
    isTodaySelected: selectedDate >= getTodayAttendanceDateKey(),
    onNextDay: () => setSelectedDate((date) => shiftDate(date, 1)),
    onPreviousDay: () => setSelectedDate((date) => shiftDate(date, -1)),
    onSearchChange: setSearch,
    onSelectDate: setSelectedDate,
    onToday: () => setSelectedDate(getTodayAttendanceDateKey()),
    recordsError: recordsError || (leaveStatus.error ? "Could not refresh staff leave status. Pull down to retry." : null),
    refresh,
    rows,
    search,
    selectedDate,
    summary: applyApprovedLeaveToSummary(summary, attendanceRecords, activeStaffMembers, leaveStatus.approvedLeaves),
  };
};
