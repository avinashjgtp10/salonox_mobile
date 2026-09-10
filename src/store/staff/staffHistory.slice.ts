import { createSlice } from "@reduxjs/toolkit";

import {
  fetchStaffAttendanceHistoryThunk,
  fetchStaffSaleHistoryThunk,
} from "@/middleware/staff/staffHistory.thunk";
import type { RootState } from "@/store";
import type { AttendanceRecord } from "@/types/attendance";
import type { StaffSaleItem } from "@/types/sales";

type StaffHistoryState = {
  attendanceByStaffId: Record<string, AttendanceRecord[]>;
  attendanceErrorByStaffId: Record<string, string | null>;
  attendanceLoadedStaffIds: string[];
  attendanceLoadingStaffIds: string[];
  salesByStaffId: Record<string, StaffSaleItem[]>;
  salesErrorByStaffId: Record<string, string | null>;
  salesLoadedStaffIds: string[];
  salesLoadingStaffIds: string[];
};

const initialState: StaffHistoryState = {
  attendanceByStaffId: {},
  attendanceErrorByStaffId: {},
  attendanceLoadedStaffIds: [],
  attendanceLoadingStaffIds: [],
  salesByStaffId: {},
  salesErrorByStaffId: {},
  salesLoadedStaffIds: [],
  salesLoadingStaffIds: [],
};

const withStaffId = (staffIds: string[], staffId: string) =>
  staffIds.includes(staffId) ? staffIds : [...staffIds, staffId];

const staffHistorySlice = createSlice({
  name: "staffHistory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffSaleHistoryThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.salesErrorByStaffId[staffId] = null;
        state.salesLoadingStaffIds = withStaffId(state.salesLoadingStaffIds, staffId);
      })
      .addCase(fetchStaffSaleHistoryThunk.fulfilled, (state, action) => {
        const { items, staffId } = action.payload;

        state.salesByStaffId[staffId] = items;
        state.salesLoadedStaffIds = withStaffId(state.salesLoadedStaffIds, staffId);
        state.salesLoadingStaffIds = state.salesLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchStaffSaleHistoryThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.salesErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load sale history.";
        state.salesLoadingStaffIds = state.salesLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchStaffAttendanceHistoryThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.attendanceErrorByStaffId[staffId] = null;
        state.attendanceLoadingStaffIds = withStaffId(state.attendanceLoadingStaffIds, staffId);
      })
      .addCase(fetchStaffAttendanceHistoryThunk.fulfilled, (state, action) => {
        const { records, staffId } = action.payload;

        state.attendanceByStaffId[staffId] = records;
        state.attendanceLoadedStaffIds = withStaffId(state.attendanceLoadedStaffIds, staffId);
        state.attendanceLoadingStaffIds = state.attendanceLoadingStaffIds.filter(
          (id) => id !== staffId,
        );
      })
      .addCase(fetchStaffAttendanceHistoryThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.attendanceErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load attendance history.";
        state.attendanceLoadingStaffIds = state.attendanceLoadingStaffIds.filter(
          (id) => id !== staffId,
        );
      });
  },
});

export const selectStaffSaleHistory = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.salesByStaffId[staffId] ?? [] : [];
export const selectStaffSaleHistoryLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.salesLoadedStaffIds.includes(staffId) : false;
export const selectStaffSaleHistoryLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.salesLoadingStaffIds.includes(staffId) : false;
export const selectStaffSaleHistoryError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.salesErrorByStaffId[staffId] ?? null : null;

export const selectStaffAttendanceHistory = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.attendanceByStaffId[staffId] ?? [] : [];
export const selectStaffAttendanceHistoryLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.attendanceLoadedStaffIds.includes(staffId) : false;
export const selectStaffAttendanceHistoryLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.attendanceLoadingStaffIds.includes(staffId) : false;
export const selectStaffAttendanceHistoryError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffHistory.attendanceErrorByStaffId[staffId] ?? null : null;

export default staffHistorySlice.reducer;
