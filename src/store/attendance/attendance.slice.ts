import { createSelector, createSlice } from "@reduxjs/toolkit";

import { getAttendanceErrorMessage } from "@/features/attendance/utils/attendanceStatus";
import {
  checkInThunk,
  checkOutThunk,
  fetchAttendanceSummaryThunk,
  fetchTodayAttendanceThunk,
  hydrateAttendanceFromCacheThunk,
  markAttendanceThunk,
  updateAttendanceSettingsThunk,
  updateAttendanceThunk,
  type AttendanceErrorKind,
} from "@/middleware/attendance/attendance.thunk";
import type { RootState } from "@/store";
import type { AttendanceRecord, AttendanceSettings, AttendanceSummary } from "@/types/attendance";

type ResourceStatus = "idle" | "loading" | "succeeded" | "failed";

type AttendanceToast = {
  message: string;
  tone: "error" | "success";
};

type AttendanceState = {
  checkInErrorByStaffId: Record<string, string | null>;
  checkOutErrorByStaffId: Record<string, string | null>;
  checkingInStaffIds: string[];
  checkingOutStaffIds: string[];
  date: string | null;
  markErrorByStaffId: Record<string, string | null>;
  markingStaffIds: string[];
  records: AttendanceRecord[];
  recordsError: string | null;
  recordsErrorKind: AttendanceErrorKind | null;
  recordsIsFromCache: boolean;
  recordsLastFetchedAt: number | null;
  recordsRefreshing: boolean;
  recordsStatus: ResourceStatus;
  settings: AttendanceSettings | null;
  settingsError: string | null;
  settingsUpdating: boolean;
  summary: AttendanceSummary;
  summaryError: string | null;
  summaryErrorKind: AttendanceErrorKind | null;
  summaryIsFromCache: boolean;
  summaryLastFetchedAt: number | null;
  summaryRefreshing: boolean;
  summaryStatus: ResourceStatus;
  toast: AttendanceToast | null;
  updateErrorByAttendanceId: Record<string, string | null>;
  updatingAttendanceIds: string[];
};

const EMPTY_SUMMARY: AttendanceSummary = {
  absent: 0,
  date: null,
  halfDay: 0,
  late: 0,
  onLeave: 0,
  present: 0,
  total: 0,
};

const initialState: AttendanceState = {
  checkInErrorByStaffId: {},
  checkOutErrorByStaffId: {},
  checkingInStaffIds: [],
  checkingOutStaffIds: [],
  date: null,
  markErrorByStaffId: {},
  markingStaffIds: [],
  records: [],
  recordsError: null,
  recordsErrorKind: null,
  recordsIsFromCache: false,
  recordsLastFetchedAt: null,
  recordsRefreshing: false,
  recordsStatus: "idle",
  settings: null,
  settingsError: null,
  settingsUpdating: false,
  summary: EMPTY_SUMMARY,
  summaryError: null,
  summaryErrorKind: null,
  summaryIsFromCache: false,
  summaryLastFetchedAt: null,
  summaryRefreshing: false,
  summaryStatus: "idle",
  toast: null,
  updateErrorByAttendanceId: {},
  updatingAttendanceIds: [],
};

// Updates the matching row in place, or appends it when this is the first
// time a record exists for that staff member (e.g. their first manual mark).
const upsertRecord = (records: AttendanceRecord[], incoming: AttendanceRecord) => {
  const index = records.findIndex(
    (record) => record.id === incoming.id || record.staffId === incoming.staffId,
  );

  if (index === -1) {
    return [...records, incoming];
  }

  const next = [...records];
  next[index] = incoming;

  return next;
};

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    clearAttendanceToast(state) {
      state.toast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAttendanceFromCacheThunk.fulfilled, (state, action) => {
        if (state.recordsStatus === "idle" && action.payload.today) {
          state.date = action.payload.today.date;
          state.records = action.payload.today.records;
          state.recordsIsFromCache = true;
        }

        if (state.summaryStatus === "idle" && action.payload.summary) {
          state.summary = action.payload.summary;
          state.summaryIsFromCache = true;
        }
      })
      .addCase(fetchTodayAttendanceThunk.pending, (state) => {
        const hasExistingData = state.recordsLastFetchedAt !== null || state.records.length > 0;

        state.recordsError = null;
        state.recordsErrorKind = null;
        state.recordsRefreshing = hasExistingData;
        state.recordsStatus = hasExistingData ? "succeeded" : "loading";
      })
      .addCase(fetchTodayAttendanceThunk.fulfilled, (state, action) => {
        state.date = action.payload.date;
        state.records = action.payload.records;
        if (action.payload.summary) {
          state.summary = action.payload.summary;
          state.summaryError = null;
          state.summaryErrorKind = null;
          state.summaryIsFromCache = false;
          state.summaryLastFetchedAt = Date.now();
          state.summaryRefreshing = false;
          state.summaryStatus = "succeeded";
        }
        state.recordsError = null;
        state.recordsErrorKind = null;
        state.recordsIsFromCache = false;
        state.recordsLastFetchedAt = Date.now();
        state.recordsRefreshing = false;
        state.recordsStatus = "succeeded";
      })
      .addCase(fetchTodayAttendanceThunk.rejected, (state, action) => {
        const hasExistingData = state.recordsLastFetchedAt !== null || state.records.length > 0;

        state.recordsError =
          action.payload?.message ?? action.error.message ?? "Unable to load today's attendance.";
        state.recordsErrorKind = action.payload?.kind ?? "unknown";
        state.recordsRefreshing = false;
        state.recordsStatus = hasExistingData ? "succeeded" : "failed";
      })
      .addCase(fetchAttendanceSummaryThunk.pending, (state) => {
        const hasExistingData = state.summaryLastFetchedAt !== null;

        state.summaryError = null;
        state.summaryErrorKind = null;
        state.summaryRefreshing = hasExistingData;
        state.summaryStatus = hasExistingData ? "succeeded" : "loading";
      })
      .addCase(fetchAttendanceSummaryThunk.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.summaryError = null;
        state.summaryErrorKind = null;
        state.summaryIsFromCache = false;
        state.summaryLastFetchedAt = Date.now();
        state.summaryRefreshing = false;
        state.summaryStatus = "succeeded";
      })
      .addCase(fetchAttendanceSummaryThunk.rejected, (state, action) => {
        const hasExistingData = state.summaryLastFetchedAt !== null;

        state.summaryError =
          action.payload?.message ?? action.error.message ?? "Unable to load attendance summary.";
        state.summaryErrorKind = action.payload?.kind ?? "unknown";
        state.summaryRefreshing = false;
        state.summaryStatus = hasExistingData ? "succeeded" : "failed";
      })
      .addCase(checkInThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.checkInErrorByStaffId[staffId] = null;
        state.checkingInStaffIds = [...state.checkingInStaffIds, staffId];
      })
      .addCase(checkInThunk.fulfilled, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.checkingInStaffIds = state.checkingInStaffIds.filter((id) => id !== staffId);
        state.toast = { message: action.payload.message ?? "Checked in successfully.", tone: "success" };

        if (action.payload.record) {
          state.records = upsertRecord(state.records, action.payload.record);
        }
      })
      .addCase(checkInThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;
        const message = getAttendanceErrorMessage(action.payload?.kind, action.payload?.message);

        state.checkInErrorByStaffId[staffId] = message;
        state.checkingInStaffIds = state.checkingInStaffIds.filter((id) => id !== staffId);
        state.toast = { message, tone: "error" };
      })
      .addCase(checkOutThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.checkOutErrorByStaffId[staffId] = null;
        state.checkingOutStaffIds = [...state.checkingOutStaffIds, staffId];
      })
      .addCase(checkOutThunk.fulfilled, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.checkingOutStaffIds = state.checkingOutStaffIds.filter((id) => id !== staffId);
        state.toast = { message: action.payload.message ?? "Checked out successfully.", tone: "success" };

        if (action.payload.record) {
          state.records = upsertRecord(state.records, action.payload.record);
        }
      })
      .addCase(checkOutThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;
        const message = getAttendanceErrorMessage(action.payload?.kind, action.payload?.message);

        state.checkOutErrorByStaffId[staffId] = message;
        state.checkingOutStaffIds = state.checkingOutStaffIds.filter((id) => id !== staffId);
        state.toast = { message, tone: "error" };
      })
      .addCase(markAttendanceThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.markErrorByStaffId[staffId] = null;
        state.markingStaffIds = [...state.markingStaffIds, staffId];
      })
      .addCase(markAttendanceThunk.fulfilled, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.markingStaffIds = state.markingStaffIds.filter((id) => id !== staffId);
        state.toast = {
          message: action.payload.message ?? "Attendance marked successfully.",
          tone: "success",
        };

        if (action.payload.record) {
          state.records = upsertRecord(state.records, action.payload.record);
        }
      })
      .addCase(markAttendanceThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;
        const message = getAttendanceErrorMessage(action.payload?.kind, action.payload?.message);

        state.markErrorByStaffId[staffId] = message;
        state.markingStaffIds = state.markingStaffIds.filter((id) => id !== staffId);
        state.toast = { message, tone: "error" };
      })
      .addCase(updateAttendanceThunk.pending, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;

        state.updateErrorByAttendanceId[attendanceId] = null;
        state.updatingAttendanceIds = [...state.updatingAttendanceIds, attendanceId];
      })
      .addCase(updateAttendanceThunk.fulfilled, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;

        state.updatingAttendanceIds = state.updatingAttendanceIds.filter((id) => id !== attendanceId);
        state.toast = {
          message: action.payload.message ?? "Attendance updated successfully.",
          tone: "success",
        };

        if (action.payload.record) {
          state.records = upsertRecord(state.records, action.payload.record);
        }
      })
      .addCase(updateAttendanceThunk.rejected, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;
        const message = getAttendanceErrorMessage(action.payload?.kind, action.payload?.message);

        state.updateErrorByAttendanceId[attendanceId] = message;
        state.updatingAttendanceIds = state.updatingAttendanceIds.filter((id) => id !== attendanceId);
        state.toast = { message, tone: "error" };
      })
      .addCase(updateAttendanceSettingsThunk.pending, (state) => {
        state.settingsError = null;
        state.settingsUpdating = true;
      })
      .addCase(updateAttendanceSettingsThunk.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
        state.settingsUpdating = false;
        state.toast = {
          message: action.payload.message ?? "Attendance settings updated successfully.",
          tone: "success",
        };
      })
      .addCase(updateAttendanceSettingsThunk.rejected, (state, action) => {
        const message =
          action.payload?.message ?? action.error.message ?? "Unable to update attendance settings.";

        state.settingsError = message;
        state.settingsUpdating = false;
        state.toast = { message, tone: "error" };
      });
  },
});

export const { clearAttendanceToast } = attendanceSlice.actions;

export const selectAttendanceDate = (state: RootState) => state.attendance.date;
export const selectAttendanceRecords = (state: RootState) => state.attendance.records;
export const selectAttendanceRecordsStatus = (state: RootState) => state.attendance.recordsStatus;
export const selectAttendanceRecordsLoading = (state: RootState) =>
  state.attendance.recordsStatus === "loading";
export const selectAttendanceRecordsRefreshing = (state: RootState) =>
  state.attendance.recordsRefreshing;
export const selectAttendanceRecordsError = (state: RootState) => state.attendance.recordsError;
export const selectAttendanceRecordsErrorKind = (state: RootState) =>
  state.attendance.recordsErrorKind;
export const selectAttendanceRecordsIsFromCache = (state: RootState) =>
  state.attendance.recordsIsFromCache;
export const selectAttendanceRecordsLastFetchedAt = (state: RootState) =>
  state.attendance.recordsLastFetchedAt;

export const selectAttendanceSummary = (state: RootState) => state.attendance.summary;
export const selectAttendanceSummaryStatus = (state: RootState) => state.attendance.summaryStatus;
export const selectAttendanceSummaryLoading = (state: RootState) =>
  state.attendance.summaryStatus === "loading";
export const selectAttendanceSummaryRefreshing = (state: RootState) =>
  state.attendance.summaryRefreshing;
export const selectAttendanceSummaryError = (state: RootState) => state.attendance.summaryError;
export const selectAttendanceSummaryErrorKind = (state: RootState) =>
  state.attendance.summaryErrorKind;
export const selectAttendanceSummaryIsFromCache = (state: RootState) =>
  state.attendance.summaryIsFromCache;

export const selectAttendanceCheckingInStaffIds = (state: RootState) =>
  state.attendance.checkingInStaffIds;
export const selectAttendanceIsCheckingIn = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.checkingInStaffIds.includes(staffId) : false;
export const selectAttendanceCheckInError = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.checkInErrorByStaffId[staffId] ?? null : null;

export const selectAttendanceCheckingOutStaffIds = (state: RootState) =>
  state.attendance.checkingOutStaffIds;
export const selectAttendanceIsCheckingOut = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.checkingOutStaffIds.includes(staffId) : false;
export const selectAttendanceCheckOutError = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.checkOutErrorByStaffId[staffId] ?? null : null;

export const selectAttendanceMarkingStaffIds = (state: RootState) => state.attendance.markingStaffIds;
export const selectAttendanceIsMarking = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.markingStaffIds.includes(staffId) : false;
export const selectAttendanceMarkError = (state: RootState, staffId?: string | null) =>
  staffId ? state.attendance.markErrorByStaffId[staffId] ?? null : null;

export const selectAttendanceUpdatingIds = (state: RootState) => state.attendance.updatingAttendanceIds;
export const selectAttendanceIsUpdating = (state: RootState, attendanceId?: string | null) =>
  attendanceId ? state.attendance.updatingAttendanceIds.includes(attendanceId) : false;
export const selectAttendanceUpdateError = (state: RootState, attendanceId?: string | null) =>
  attendanceId ? state.attendance.updateErrorByAttendanceId[attendanceId] ?? null : null;

export const selectAttendanceSettings = (state: RootState) => state.attendance.settings;
export const selectAttendanceSettingsUpdating = (state: RootState) => state.attendance.settingsUpdating;
export const selectAttendanceSettingsError = (state: RootState) => state.attendance.settingsError;

export const selectAttendanceToast = (state: RootState) => state.attendance.toast;

// Memoized: only recomputes when either resource's loading/data actually changes,
// so consumers don't re-render on unrelated state churn.
export const selectAttendanceIsInitialLoading = createSelector(
  [selectAttendanceRecordsStatus, selectAttendanceRecords],
  (status, records) => status === "loading" && records.length === 0,
);

export const selectAttendanceIsOffline = createSelector(
  [selectAttendanceRecordsErrorKind, selectAttendanceSummaryErrorKind],
  (recordsErrorKind, summaryErrorKind) =>
    recordsErrorKind === "network" ||
    recordsErrorKind === "timeout" ||
    summaryErrorKind === "network" ||
    summaryErrorKind === "timeout",
);

export const selectAttendanceIsShowingCachedData = createSelector(
  [selectAttendanceRecordsIsFromCache, selectAttendanceSummaryIsFromCache],
  (recordsIsFromCache, summaryIsFromCache) => recordsIsFromCache || summaryIsFromCache,
);

export default attendanceSlice.reducer;
