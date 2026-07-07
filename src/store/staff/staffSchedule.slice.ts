import { createSlice } from "@reduxjs/toolkit";

import {
  deleteStaffScheduleThunk,
  fetchStaffScheduleThunk,
  updateStaffScheduleThunk,
} from "@/middleware/staff/staffSchedule.thunk";
import type { RootState } from "@/store";
import type { StaffSchedule } from "@/types/staffSchedule";

type StaffScheduleState = {
  deleteErrorByStaffId: Record<string, string | null>;
  deletingStaffIds: string[];
  errorByStaffId: Record<string, string | null>;
  loadedStaffIds: string[];
  loadingStaffIds: string[];
  saveErrorByStaffId: Record<string, string | null>;
  savingStaffIds: string[];
  scheduleByStaffId: Record<string, StaffSchedule | null>;
};

const initialState: StaffScheduleState = {
  deleteErrorByStaffId: {},
  deletingStaffIds: [],
  errorByStaffId: {},
  loadedStaffIds: [],
  loadingStaffIds: [],
  saveErrorByStaffId: {},
  savingStaffIds: [],
  scheduleByStaffId: {},
};

const staffScheduleSlice = createSlice({
  name: "staffSchedule",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffScheduleThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] = null;
        state.loadingStaffIds = [...state.loadingStaffIds, staffId];
      })
      .addCase(fetchStaffScheduleThunk.fulfilled, (state, action) => {
        const { schedule, staffId } = action.payload;

        state.scheduleByStaffId[staffId] = schedule;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchStaffScheduleThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load schedule.";
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateStaffScheduleThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] = null;
        state.savingStaffIds = [...state.savingStaffIds, staffId];
      })
      .addCase(updateStaffScheduleThunk.fulfilled, (state, action) => {
        const { schedule, staffId } = action.payload;

        state.scheduleByStaffId[staffId] = schedule;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateStaffScheduleThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to update schedule.";
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(deleteStaffScheduleThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.deleteErrorByStaffId[staffId] = null;
        state.deletingStaffIds = [...state.deletingStaffIds, staffId];
      })
      .addCase(deleteStaffScheduleThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.scheduleByStaffId[staffId] = null;
        state.deletingStaffIds = state.deletingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(deleteStaffScheduleThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.deleteErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to clear schedule.";
        state.deletingStaffIds = state.deletingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectStaffSchedule = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.scheduleByStaffId[staffId] ?? null : null;
export const selectStaffScheduleLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.loadedStaffIds.includes(staffId) : false;
export const selectStaffScheduleLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.loadingStaffIds.includes(staffId) : false;
export const selectStaffScheduleError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.errorByStaffId[staffId] ?? null : null;
export const selectStaffScheduleSaving = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.savingStaffIds.includes(staffId) : false;
export const selectStaffScheduleSaveError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.saveErrorByStaffId[staffId] ?? null : null;
export const selectStaffScheduleDeleting = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.deletingStaffIds.includes(staffId) : false;
export const selectStaffScheduleDeleteError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffSchedule.deleteErrorByStaffId[staffId] ?? null : null;

export default staffScheduleSlice.reducer;
