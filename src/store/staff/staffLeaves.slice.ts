import { createSlice } from "@reduxjs/toolkit";

import {
  createLeaveThunk,
  deleteLeaveThunk,
  fetchLeavesThunk,
  updateLeaveThunk,
} from "@/middleware/staff/staffLeaves.thunk";
import type { RootState } from "@/store";
import type { LeaveEntry } from "@/types/staffLeaves";

type StaffLeavesState = {
  createErrorByStaffId: Record<string, string | null>;
  creatingStaffIds: string[];
  deleteErrorByRecordKey: Record<string, string | null>;
  deletingRecordKeys: string[];
  errorByStaffId: Record<string, string | null>;
  leavesByStaffId: Record<string, LeaveEntry[]>;
  loadedStaffIds: string[];
  loadingStaffIds: string[];
  updateErrorByRecordKey: Record<string, string | null>;
  updatingRecordKeys: string[];
};

const initialState: StaffLeavesState = {
  createErrorByStaffId: {},
  creatingStaffIds: [],
  deleteErrorByRecordKey: {},
  deletingRecordKeys: [],
  errorByStaffId: {},
  leavesByStaffId: {},
  loadedStaffIds: [],
  loadingStaffIds: [],
  updateErrorByRecordKey: {},
  updatingRecordKeys: [],
};

const getRecordKey = (staffId: string, recordId: string) => `${staffId}:${recordId}`;

const upsertLeave = (entries: LeaveEntry[], incoming: LeaveEntry) => {
  const index = entries.findIndex((entry) => entry.id === incoming.id);

  if (index === -1) {
    return [incoming, ...entries];
  }

  const nextEntries = [...entries];
  nextEntries[index] = incoming;

  return nextEntries;
};

const staffLeavesSlice = createSlice({
  name: "staffLeaves",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeavesThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] = null;
        state.loadingStaffIds = [...state.loadingStaffIds, staffId];
      })
      .addCase(fetchLeavesThunk.fulfilled, (state, action) => {
        const { leaves, staffId } = action.payload;

        state.leavesByStaffId[staffId] = leaves;
        state.loadedStaffIds = state.loadedStaffIds.includes(staffId)
          ? state.loadedStaffIds
          : [...state.loadedStaffIds, staffId];
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchLeavesThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.errorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load leaves.";
        state.loadingStaffIds = state.loadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(createLeaveThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.createErrorByStaffId[staffId] = null;
        state.creatingStaffIds = [...state.creatingStaffIds, staffId];
      })
      .addCase(createLeaveThunk.fulfilled, (state, action) => {
        const { leave, staffId } = action.payload;

        state.leavesByStaffId[staffId] = upsertLeave(state.leavesByStaffId[staffId] ?? [], leave);
        state.creatingStaffIds = state.creatingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(createLeaveThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.createErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to request leave.";
        state.creatingStaffIds = state.creatingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateLeaveThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.updateErrorByRecordKey[recordKey] = null;
        state.updatingRecordKeys = [...state.updatingRecordKeys, recordKey];
      })
      .addCase(updateLeaveThunk.fulfilled, (state, action) => {
        const { leave, recordId, staffId } = action.payload;
        const recordKey = getRecordKey(staffId, recordId);

        state.leavesByStaffId[staffId] = upsertLeave(state.leavesByStaffId[staffId] ?? [], leave);
        state.updatingRecordKeys = state.updatingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(updateLeaveThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.updateErrorByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to update leave.";
        state.updatingRecordKeys = state.updatingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(deleteLeaveThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.deleteErrorByRecordKey[recordKey] = null;
        state.deletingRecordKeys = [...state.deletingRecordKeys, recordKey];
      })
      .addCase(deleteLeaveThunk.fulfilled, (state, action) => {
        const { recordId, staffId } = action.payload;
        const recordKey = getRecordKey(staffId, recordId);

        state.leavesByStaffId[staffId] = (state.leavesByStaffId[staffId] ?? []).filter(
          (entry) => entry.id !== recordId,
        );
        state.deletingRecordKeys = state.deletingRecordKeys.filter((key) => key !== recordKey);
      })
      .addCase(deleteLeaveThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getRecordKey(staffId, recordId);

        state.deleteErrorByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to delete leave.";
        state.deletingRecordKeys = state.deletingRecordKeys.filter((key) => key !== recordKey);
      });
  },
});

export const selectLeaves = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.leavesByStaffId[staffId] ?? [] : [];
export const selectLeavesLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.loadedStaffIds.includes(staffId) : false;
export const selectLeavesLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.loadingStaffIds.includes(staffId) : false;
export const selectLeavesError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.errorByStaffId[staffId] ?? null : null;
export const selectLeaveCreating = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.creatingStaffIds.includes(staffId) : false;
export const selectLeaveCreateError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffLeaves.createErrorByStaffId[staffId] ?? null : null;
export const selectLeaveUpdating = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffLeaves.updatingRecordKeys.includes(getRecordKey(staffId, recordId))
    : false;
export const selectLeaveUpdateError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffLeaves.updateErrorByRecordKey[getRecordKey(staffId, recordId)] ?? null
    : null;
export const selectLeaveDeleting = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffLeaves.deletingRecordKeys.includes(getRecordKey(staffId, recordId))
    : false;
export const selectLeaveDeleteError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staffLeaves.deleteErrorByRecordKey[getRecordKey(staffId, recordId)] ?? null
    : null;

export default staffLeavesSlice.reducer;
