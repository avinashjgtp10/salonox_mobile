import { createSlice } from "@reduxjs/toolkit";

import {
  acceptInviteThunk,
  cancelInviteThunk,
  fetchInvitationStatusThunk,
  resendInviteThunk,
  verifyInviteTokenThunk,
} from "@/middleware/staff/staffInvitations.thunk";
import type { RootState } from "@/store";
import type { InvitationStatus, VerifyInviteResult } from "@/types/staffInvitations";

type StaffInvitationsState = {
  accepting: boolean;
  acceptError: string | null;
  cancelErrorByStaffId: Record<string, string | null>;
  cancelingStaffIds: string[];
  resendErrorByStaffId: Record<string, string | null>;
  resendingStaffIds: string[];
  statusByStaffId: Record<string, InvitationStatus>;
  statusErrorByStaffId: Record<string, string | null>;
  statusLoadedStaffIds: string[];
  statusLoadingStaffIds: string[];
  verifyError: string | null;
  verifying: boolean;
  verifyResult: VerifyInviteResult | null;
};

const initialState: StaffInvitationsState = {
  accepting: false,
  acceptError: null,
  cancelErrorByStaffId: {},
  cancelingStaffIds: [],
  resendErrorByStaffId: {},
  resendingStaffIds: [],
  statusByStaffId: {},
  statusErrorByStaffId: {},
  statusLoadedStaffIds: [],
  statusLoadingStaffIds: [],
  verifyError: null,
  verifying: false,
  verifyResult: null,
};

const staffInvitationsSlice = createSlice({
  name: "staffInvitations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvitationStatusThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.statusErrorByStaffId[staffId] = null;
        state.statusLoadingStaffIds = [...state.statusLoadingStaffIds, staffId];
      })
      .addCase(fetchInvitationStatusThunk.fulfilled, (state, action) => {
        const { staffId, status } = action.payload;

        state.statusByStaffId[staffId] = status;
        state.statusLoadedStaffIds = state.statusLoadedStaffIds.includes(staffId)
          ? state.statusLoadedStaffIds
          : [...state.statusLoadedStaffIds, staffId];
        state.statusLoadingStaffIds = state.statusLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchInvitationStatusThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.statusErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load invitation status.";
        state.statusLoadingStaffIds = state.statusLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(resendInviteThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.resendErrorByStaffId[staffId] = null;
        state.resendingStaffIds = [...state.resendingStaffIds, staffId];
      })
      .addCase(resendInviteThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.resendingStaffIds = state.resendingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(resendInviteThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.resendErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to resend invite.";
        state.resendingStaffIds = state.resendingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(cancelInviteThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.cancelErrorByStaffId[staffId] = null;
        state.cancelingStaffIds = [...state.cancelingStaffIds, staffId];
      })
      .addCase(cancelInviteThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.cancelingStaffIds = state.cancelingStaffIds.filter((id) => id !== staffId);

        const existingStatus = state.statusByStaffId[staffId];

        if (existingStatus) {
          state.statusByStaffId[staffId] = { ...existingStatus, status: "cancelled" };
        }
      })
      .addCase(cancelInviteThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.cancelErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to cancel invite.";
        state.cancelingStaffIds = state.cancelingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(verifyInviteTokenThunk.pending, (state) => {
        state.verifyError = null;
        state.verifying = true;
        state.verifyResult = null;
      })
      .addCase(verifyInviteTokenThunk.fulfilled, (state, action) => {
        state.verifying = false;
        state.verifyResult = action.payload;
      })
      .addCase(verifyInviteTokenThunk.rejected, (state, action) => {
        state.verifying = false;
        state.verifyError =
          action.payload?.message ?? action.error.message ?? "This invite link is invalid or has expired.";
      })
      .addCase(acceptInviteThunk.pending, (state) => {
        state.acceptError = null;
        state.accepting = true;
      })
      .addCase(acceptInviteThunk.fulfilled, (state) => {
        state.accepting = false;
      })
      .addCase(acceptInviteThunk.rejected, (state, action) => {
        state.accepting = false;
        state.acceptError =
          action.payload?.message ?? action.error.message ?? "Unable to accept invite.";
      });
  },
});

export const selectInvitationStatus = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.statusByStaffId[staffId] ?? null : null;
export const selectInvitationStatusLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.statusLoadedStaffIds.includes(staffId) : false;
export const selectInvitationStatusLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.statusLoadingStaffIds.includes(staffId) : false;
export const selectInvitationStatusError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.statusErrorByStaffId[staffId] ?? null : null;
export const selectInviteResending = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.resendingStaffIds.includes(staffId) : false;
export const selectInviteResendError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.resendErrorByStaffId[staffId] ?? null : null;
export const selectInviteCanceling = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.cancelingStaffIds.includes(staffId) : false;
export const selectInviteCancelError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffInvitations.cancelErrorByStaffId[staffId] ?? null : null;
export const selectInviteVerifying = (state: RootState) => state.staffInvitations.verifying;
export const selectInviteVerifyError = (state: RootState) => state.staffInvitations.verifyError;
export const selectInviteVerifyResult = (state: RootState) => state.staffInvitations.verifyResult;
export const selectInviteAccepting = (state: RootState) => state.staffInvitations.accepting;
export const selectInviteAcceptError = (state: RootState) => state.staffInvitations.acceptError;

export default staffInvitationsSlice.reducer;
