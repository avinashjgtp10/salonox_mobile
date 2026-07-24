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

// Reusable check-in / check-out / manual-mark / edit dispatch + per-item busy
// state, so any screen that manages staff attendance (dashboard today, team
// detail, and future calendar/reports views) can wire the same actions
// without re-implementing the thunk calls. Success/error feedback is surfaced
// uniformly via the slice-managed toast (see AttendanceToast), not here.
export const useAttendanceActions = () => {
  const dispatch = useAppDispatch();
  const checkingInStaffIds = useAppSelector(selectAttendanceCheckingInStaffIds);
  const checkingOutStaffIds = useAppSelector(selectAttendanceCheckingOutStaffIds);
  const markingStaffIds = useAppSelector(selectAttendanceMarkingStaffIds);
  const updatingAttendanceIds = useAppSelector(selectAttendanceUpdatingIds);

  // Returns the unwrapped result so callers that need to know success/failure
  // (e.g. to close a modal only once the save actually lands) can await it;
  // callers that only need to fire-and-forget can ignore the promise.
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
