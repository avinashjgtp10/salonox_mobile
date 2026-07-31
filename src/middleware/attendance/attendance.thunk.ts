import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { attendanceService } from "@/services/attendance.service";
import { attendanceCache } from "@/services/attendanceCache";
import { emitRealtimeEntityChanged } from "@/services/realtimeEvents";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  AttendanceSummary,
  AttendanceToday,
  CheckInRequest,
  CheckInResponse,
  CheckOutRequest,
  CheckOutResponse,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  UpdateAttendanceRequest,
  UpdateAttendanceResponse,
  UpdateAttendanceSettingsRequest,
  UpdateAttendanceSettingsResponse,
} from "@/types/attendance";

export type AttendanceErrorKind =
  | "forbidden"
  | "network"
  | "server"
  | "timeout"
  | "unauthorized"
  | "unknown";

export type AttendanceRejectValue = {
  kind: AttendanceErrorKind;
  message: string;
  responseBody?: unknown;
  status?: number;
};

const getErrorKind = (error: unknown, status?: number): AttendanceErrorKind => {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (typeof status === "number" && status >= 500) {
    return "server";
  }

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return "timeout";
  }

  if (typeof status !== "number") {
    return "network";
  }

  return "unknown";
};

const toRejectValue = (error: unknown): AttendanceRejectValue => {
  const status = error instanceof ApiError ? error.status : undefined;

  return {
    kind: getErrorKind(error, status),
    message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
    responseBody: error instanceof ApiError ? error.responseData : undefined,
    status,
  };
};

// Seeds the slice from the last successfully cached response so the UI has
// something to show the instant the screen mounts, before the network call
// (dispatched separately) resolves. The reducer only applies this while the
// live resource is still idle, so it never clobbers fresher network data.
export const hydrateAttendanceFromCacheThunk = createAsyncThunk<
  { summary: AttendanceSummary | null; today: AttendanceToday | null },
  void,
  { state: RootState }
>("attendance/hydrateFromCache", async () => {
  const [today, summary] = await Promise.all([attendanceCache.getToday(), attendanceCache.getSummary()]);

  return { summary, today };
});

export const fetchTodayAttendanceThunk = createAsyncThunk<
  AttendanceToday,
  string | undefined,
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/fetchToday", async (date, { getState, rejectWithValue }) => {
  try {
    const today = await attendanceService.getToday(selectActiveBranchId(getState()), date);

    void attendanceCache.setToday(today);

    return today;
  } catch (error) {
    console.error("[Attendance] Fetch today failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchAttendanceSummaryThunk = createAsyncThunk<
  AttendanceSummary,
  string | undefined,
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/fetchSummary", async (date, { getState, rejectWithValue }) => {
  try {
    const summary = await attendanceService.getSummary(selectActiveBranchId(getState()), date);

    void attendanceCache.setSummary(summary);

    return summary;
  } catch (error) {
    console.error("[Attendance] Fetch summary failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

// Thin orchestration thunk used by screens that show both the live staff list
// and the summary cards together. It intentionally has no reducer cases of
// its own — each child thunk updates its own slice of state, so dispatching
// this never double-tracks loading/error flags.
export const fetchAttendanceOverviewThunk = createAsyncThunk<
  void,
  string | undefined,
  { state: RootState }
>("attendance/fetchOverview", async (date, { dispatch }) => {
  await Promise.all([dispatch(fetchTodayAttendanceThunk(date)), dispatch(fetchAttendanceSummaryThunk(date))]);
});

export const checkInThunk = createAsyncThunk<
  CheckInResponse,
  CheckInRequest & { date?: string },
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/checkIn", async (payload, { dispatch, rejectWithValue }) => {
  try {
    const response = await attendanceService.checkIn(payload);

    void dispatch(fetchAttendanceOverviewThunk(payload.date));
    void dispatch(fetchDashboardThunk());
    void dispatch(fetchStaffThunk({ page: 1, refresh: true, reset: true }));
    void dispatch(fetchUnreadCountThunk());
    emitRealtimeEntityChanged({
      entity: "attendance",
      payload: { action: "checked-in", record: response.record, staffId: payload.staffId },
    });
    emitRealtimeEntityChanged({ entity: "dashboard", payload: { source: "attendance.checkIn" } });
    emitRealtimeEntityChanged({ entity: "staff", payload: { source: "attendance.checkIn", staffId: payload.staffId } });
    emitRealtimeEntityChanged({ entity: "notifications", payload: { source: "attendance.checkIn" } });

    return response;
  } catch (error) {
    console.error("[Attendance] Check-in failed", { staffId: payload.staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const checkOutThunk = createAsyncThunk<
  CheckOutResponse,
  CheckOutRequest & { date?: string },
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/checkOut", async (payload, { dispatch, rejectWithValue }) => {
  try {
    const response = await attendanceService.checkOut(payload);

    void dispatch(fetchAttendanceOverviewThunk(payload.date));
    void dispatch(fetchDashboardThunk());
    void dispatch(fetchStaffThunk({ page: 1, refresh: true, reset: true }));
    void dispatch(fetchUnreadCountThunk());
    emitRealtimeEntityChanged({
      entity: "attendance",
      payload: { action: "checked-out", record: response.record, staffId: payload.staffId },
    });
    emitRealtimeEntityChanged({ entity: "dashboard", payload: { source: "attendance.checkOut" } });
    emitRealtimeEntityChanged({ entity: "staff", payload: { source: "attendance.checkOut", staffId: payload.staffId } });
    emitRealtimeEntityChanged({ entity: "notifications", payload: { source: "attendance.checkOut" } });

    return response;
  } catch (error) {
    console.error("[Attendance] Check-out failed", { staffId: payload.staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const markAttendanceThunk = createAsyncThunk<
  MarkAttendanceResponse,
  MarkAttendanceRequest,
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/mark", async (payload, { dispatch, rejectWithValue }) => {
  try {
    const response = await attendanceService.markAttendance(payload);

    void dispatch(fetchAttendanceOverviewThunk(payload.date));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    console.error("[Attendance] Manual mark failed", { ...payload, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateAttendanceThunk = createAsyncThunk<
  UpdateAttendanceResponse,
  { attendanceId: string; date?: string; updates: UpdateAttendanceRequest },
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/update", async ({ attendanceId, date, updates }, { dispatch, rejectWithValue }) => {
  try {
    const response = await attendanceService.updateAttendance(attendanceId, updates);

    void dispatch(fetchAttendanceOverviewThunk(date));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    console.error("[Attendance] Update failed", { attendanceId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateAttendanceSettingsThunk = createAsyncThunk<
  UpdateAttendanceSettingsResponse,
  UpdateAttendanceSettingsRequest,
  { rejectValue: AttendanceRejectValue; state: RootState }
>("attendance/updateSettings", async (updates, { dispatch, rejectWithValue }) => {
  try {
    const response = await attendanceService.updateSettings(updates);

    void dispatch(fetchAttendanceOverviewThunk());
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    console.error("[Attendance] Settings update failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});
