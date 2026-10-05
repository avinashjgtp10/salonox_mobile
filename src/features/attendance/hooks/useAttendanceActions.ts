import { useCallback } from "react";

import {
  checkInThunk,
  checkOutThunk,
  markAttendanceThunk,
  updateAttendanceThunk,
} from "@/middleware/attendance/attendance.thunk";
import {
  selectAttendanceCheckingInStaffIds,
  selectAttendanceCheckingOutStaffIds,
  selectAttendanceMarkingStaffIds,
  selectAttendanceUpdatingIds,
} from "@/store/attendance/attendance.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  CheckInRequest,
  CheckOutRequest,
  ManualAttendanceStatus,
  UpdateAttendanceRequest,
} from "@/types/attendance";

export const useAttendanceActions = () => {
  const dispatch = useAppDispatch();
  const checkingInStaffIds = useAppSelector(selectAttendanceCheckingInStaffIds);
  const checkingOutStaffIds = useAppSelector(selectAttendanceCheckingOutStaffIds);
  const markingStaffIds = useAppSelector(selectAttendanceMarkingStaffIds);
  const updatingAttendanceIds = useAppSelector(selectAttendanceUpdatingIds);

  const checkIn = useCallback(
    (payload: CheckInRequest & { date?: string }) => dispatch(checkInThunk(payload)).unwrap(),
    [dispatch],
  );
  const checkOut = useCallback(
    (payload: CheckOutRequest & { date?: string }) => dispatch(checkOutThunk(payload)).unwrap(),
    [dispatch],
  );

  const markAttendance = useCallback(
    (staffId: string, status: ManualAttendanceStatus, notes?: string, date?: string) =>
      dispatch(markAttendanceThunk({ date, notes, staffId, status })).unwrap(),
    [dispatch],
  );

  const updateAttendance = useCallback(
    (attendanceId: string, updates: UpdateAttendanceRequest, date?: string) =>
      dispatch(updateAttendanceThunk({ attendanceId, date, updates })).unwrap(),
    [dispatch],
  );

  return {
    checkIn,
    checkingInStaffIds,
    checkingOutStaffIds,
    checkOut,
    markAttendance,
    markingStaffIds,
    updateAttendance,
    updatingAttendanceIds,
  };
};
