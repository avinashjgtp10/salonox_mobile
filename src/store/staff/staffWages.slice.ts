import { createSlice } from "@reduxjs/toolkit";

import { fetchStaffWageThunk, updateStaffWageThunk } from "@/middleware/staff/staffWages.thunk";
import type { RootState } from "@/store";
import type { StaffWage } from "@/types/staffWages";

type StaffWagesState = {
  errorByStaffId: Record<string, string | null>;
  loadedStaffIds: string[];
  loadingStaffIds: string[];
  saveErrorByStaffId: Record<string, string | null>;
  savingStaffIds: string[];
  wageByStaffId: Record<string, StaffWage | null>;
};

const initialState: StaffWagesState = {
  errorByStaffId: {},
  loadedStaffIds: [],
  loadingStaffIds: [],
  saveErrorByStaffId: {},
  savingStaffIds: [],
  wageByStaffId: {},
};

const staffWagesSlice = createSlice({
  name: "staffWages",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffWageThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] = null;
        state.loadingStaffIds = [...state.loadingStaffIds, staffId];
      })
      .addCase(fetchStaffWageThunk.fulfilled, (state, action) => {
        const { staffId, wage } = action.payload;

        state.wageByStaffId[staffId] = wage;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchStaffWageThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load wage details.";
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateStaffWageThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] = null;
        state.savingStaffIds = [...state.savingStaffIds, staffId];
      })
      .addCase(updateStaffWageThunk.fulfilled, (state, action) => {
        const { staffId, wage } = action.payload;

        state.wageByStaffId[staffId] = wage;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateStaffWageThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to update wage.";
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectStaffWage = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.wageByStaffId[staffId] ?? null : null;
export const selectStaffWageLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.loadedStaffIds.includes(staffId) : false;
export const selectStaffWageLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.loadingStaffIds.includes(staffId) : false;
export const selectStaffWageError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.errorByStaffId[staffId] ?? null : null;
export const selectStaffWageSaving = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.savingStaffIds.includes(staffId) : false;
export const selectStaffWageSaveError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffWages.saveErrorByStaffId[staffId] ?? null : null;

export default staffWagesSlice.reducer;
