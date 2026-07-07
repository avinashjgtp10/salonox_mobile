import { createSlice } from "@reduxjs/toolkit";

import { fetchPayRunsThunk, upsertPayRunThunk } from "@/middleware/staff/staffPayRuns.thunk";
import type { RootState } from "@/store";
import type { PayRunEntry } from "@/types/staffPayRuns";

type StaffPayRunsState = {
  errorByStaffId: Record<string, string | null>;
  loadedStaffIds: string[];
  loadingStaffIds: string[];
  payRunsByStaffId: Record<string, PayRunEntry[]>;
  saveErrorByStaffId: Record<string, string | null>;
  savingStaffIds: string[];
};

const initialState: StaffPayRunsState = {
  errorByStaffId: {},
  loadedStaffIds: [],
  loadingStaffIds: [],
  payRunsByStaffId: {},
  saveErrorByStaffId: {},
  savingStaffIds: [],
};

const upsertPayRunEntry = (entries: PayRunEntry[], incoming: PayRunEntry) => {
  const index = entries.findIndex((entry) => entry.id === incoming.id);

  if (index === -1) {
    return [incoming, ...entries];
  }

  const nextEntries = [...entries];
  nextEntries[index] = incoming;

  return nextEntries;
};

const staffPayRunsSlice = createSlice({
  name: "staffPayRuns",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayRunsThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] = null;
        state.loadingStaffIds = [...state.loadingStaffIds, staffId];
      })
      .addCase(fetchPayRunsThunk.fulfilled, (state, action) => {
        const { payRuns, staffId } = action.payload;

        state.payRunsByStaffId[staffId] = payRuns;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchPayRunsThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load pay runs.";
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(upsertPayRunThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] = null;
        state.savingStaffIds = [...state.savingStaffIds, staffId];
      })
      .addCase(upsertPayRunThunk.fulfilled, (state, action) => {
        const { payRun, staffId } = action.payload;

        state.payRunsByStaffId[staffId] = upsertPayRunEntry(
          state.payRunsByStaffId[staffId] ?? [],
          payRun,
        );
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(upsertPayRunThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.saveErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to save pay run.";
        state.savingStaffIds = state.savingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectPayRuns = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.payRunsByStaffId[staffId] ?? [] : [];
export const selectPayRunsLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.loadedStaffIds.includes(staffId) : false;
export const selectPayRunsLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.loadingStaffIds.includes(staffId) : false;
export const selectPayRunsError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.errorByStaffId[staffId] ?? null : null;
export const selectPayRunSaving = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.savingStaffIds.includes(staffId) : false;
export const selectPayRunSaveError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffPayRuns.saveErrorByStaffId[staffId] ?? null : null;

export default staffPayRunsSlice.reducer;
