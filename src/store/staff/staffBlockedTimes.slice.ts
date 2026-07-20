import { createSlice } from "@reduxjs/toolkit";

import {
  createBlockedTimeThunk,
  deleteBlockedTimeThunk,
  fetchBlockedTimesThunk,
  updateBlockedTimeThunk,
} from "@/middleware/staff/staffBlockedTimes.thunk";
import type { RootState } from "@/store";
import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";

type StaffBlockedTimesState = {
  blockedTimesByStaffId: Record<string, BlockedTimeEntry[]>;
  createErrorByStaffId: Record<string, string | null>;
  creatingStaffIds: string[];
  deleteErrorByRecordKey: Record<string, string | null>;
  deletingRecordKeys: string[];
  errorByStaffId: Record<string, string | null>;
  loadedStaffIds: string[];
  loadingStaffIds: string[];
  updateErrorByRecordKey: Record<string, string | null>;
  updatingRecordKeys: string[];
};

const initialState: StaffBlockedTimesState = {
  blockedTimesByStaffId: {},
  createErrorByStaffId: {},
  creatingStaffIds: [],
  deleteErrorByRecordKey: {},
  deletingRecordKeys: [],
  errorByStaffId: {},
  loadedStaffIds: [],
  loadingStaffIds: [],
  updateErrorByRecordKey: {},
  updatingRecordKeys: [],
};

const getRecordKey = (staffId: string, recordId: string) => `${staffId}:${recordId}`;

const upsertBlockedTime = (entries: BlockedTimeEntry[], incoming: BlockedTimeEntry) => {
  const index = entries.findIndex((entry) => entry.id === incoming.id);

  if (index === -1) {
    return [incoming, ...entries];
  }

  const nextEntries = [...entries];
  nextEntries[index] = incoming;

  return nextEntries;
};

const staffBlockedTimesSlice = createSlice({
  name: "staffBlockedTimes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlockedTimesThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] = null;
        state.loadingStaffIds = [...state.loadingStaffIds, staffId];
      })
      .addCase(fetchBlockedTimesThunk.fulfilled, (state, action) => {
        const { blockedTimes, staffId } = action.payload;

        state.blockedTimesByStaffId[staffId] = blockedTimes;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchBlockedTimesThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load blocked times.";
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(createBlockedTimeThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.createErrorByStaffId[staffId] = null;
        state.creatingStaffIds = [...state.creatingStaffIds, staffId];
      })
      .addCase(createBlockedTimeThunk.fulfilled, (state, action) => {
        const { blockedTime, staffId } = action.payload;

        state.blockedTimesByStaffId[staffId] = upsertBlockedTime(
          state.blockedTimesByStaffId[staffId] ?? [],
          blockedTime,
        );
        state.creatingStaffIds = state.creatingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(createBlockedTimeThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.createErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to add blocked time.";
        state.creatingStaffIds = state.creatingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateBlockedTimeThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.updateErrorByRecordKey[recordKey] = null;
        state.updatingRecordKeys = [...state.updatingRecordKeys, recordKey];
      })
      .addCase(updateBlockedTimeThunk.fulfilled, (state, action) => {
        const { blockedTime, recordId, staffId } = action.payload;
        const recordKey = getRecordKey(staffId, recordId);

        state.blockedTimesByStaffId[staffId] = upsertBlockedTime(
          state.blockedTimesByStaffId[staffId] ?? [],
          blockedTime,
        );
        state.updatingRecordKeys = state.updatingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(updateBlockedTimeThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.updateErrorByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to update blocked time.";
        state.updatingRecordKeys = state.updatingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(deleteBlockedTimeThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.deleteErrorByRecordKey[recordKey] = null;
        state.deletingRecordKeys = [...state.deletingRecordKeys, recordKey];
      })
      .addCase(deleteBlockedTimeThunk.fulfilled, (state, action) => {
        const { recordId, staffId } = action.payload;
        const recordKey = getRecordKey(staffId, recordId);

        state.blockedTimesByStaffId[staffId] = (state.blockedTimesByStaffId[staffId] ?? []).filter(
          (entry) => entry.id !== recordId,
        );
        state.deletingRecordKeys = state.deletingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(deleteBlockedTimeThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.deleteErrorByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to delete blocked time.";
        state.deletingRecordKeys = state.deletingRecordKeys.filter((key) => key !== recordKey);
      });
  },
});

export const selectBlockedTimes = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.blockedTimesByStaffId[staffId] ?? [] : [];
export const selectBlockedTimesForIds = (state: RootState, staffIds: string[]) =>
  staffIds.flatMap((staffId) => state.staffBlockedTimes.blockedTimesByStaffId[staffId] ?? []);
export const selectBlockedTimesLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.loadedStaffIds.includes(staffId) : false;
export const selectBlockedTimesLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.loadingStaffIds.includes(staffId) : false;
export const selectBlockedTimesLoadingForIds = (state: RootState, staffIds: string[]) =>
  staffIds.some((staffId) => state.staffBlockedTimes.loadingStaffIds.includes(staffId));
export const selectBlockedTimesError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.errorByStaffId[staffId] ?? null : null;
export const selectBlockedTimesErrorForIds = (state: RootState, staffIds: string[]) =>
  staffIds.map((staffId) => state.staffBlockedTimes.errorByStaffId[staffId]).find(Boolean) ?? null;
export const selectBlockedTimeCreating = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.creatingStaffIds.includes(staffId) : false;
export const selectBlockedTimeCreateError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffBlockedTimes.createErrorByStaffId[staffId] ?? null : null;
export const selectBlockedTimeUpdating = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffBlockedTimes.updatingRecordKeys.includes(getRecordKey(staffId, recordId))
    : false;
export const selectBlockedTimeUpdateError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffBlockedTimes.updateErrorByRecordKey[getRecordKey(staffId, recordId)] ?? null
    : null;
export const selectBlockedTimeDeleting = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffBlockedTimes.deletingRecordKeys.includes(getRecordKey(staffId, recordId))
    : false;
export const selectBlockedTimeDeleteError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffBlockedTimes.deleteErrorByRecordKey[getRecordKey(staffId, recordId)] ?? null
    : null;

export default staffBlockedTimesSlice.reducer;
