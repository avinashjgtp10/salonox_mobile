import { createSlice } from "@reduxjs/toolkit";

import { fetchCommissionHistoryThunk } from "@/middleware/staff/staffCommissions.thunk";
import type { RootState } from "@/store";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";

type StaffCommissionsState = {
  historyByStaffId: Record<string, CommissionHistoryEntry[]>;
  historyErrorByStaffId: Record<string, string | null>;
  historyLoadedStaffIds: string[];
  historyLoadingStaffIds: string[];
};

const initialState: StaffCommissionsState = {
  historyByStaffId: {},
  historyErrorByStaffId: {},
  historyLoadedStaffIds: [],
  historyLoadingStaffIds: [],
};

const staffCommissionsSlice = createSlice({
  name: "staffCommissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommissionHistoryThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.historyErrorByStaffId[staffId] = null;
        state.historyLoadingStaffIds = [...state.historyLoadingStaffIds, staffId];
      })
      .addCase(fetchCommissionHistoryThunk.fulfilled, (state, action) => {
        const { history, staffId } = action.payload;

        state.historyByStaffId[staffId] = history;
        state.historyLoadedStaffIds = state.historyLoadedStaffIds.includes(staffId)
          ? state.historyLoadedStaffIds
          : [...state.historyLoadedStaffIds, staffId];
        state.historyLoadingStaffIds = state.historyLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionHistoryThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.historyErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load commission history.";
        state.historyLoadingStaffIds = state.historyLoadingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectCommissionHistory = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyByStaffId[staffId] ?? [] : [];
export const selectCommissionHistoryLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyLoadedStaffIds.includes(staffId) : false;
export const selectCommissionHistoryLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyLoadingStaffIds.includes(staffId) : false;
export const selectCommissionHistoryError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyErrorByStaffId[staffId] ?? null : null;

export default staffCommissionsSlice.reducer;
