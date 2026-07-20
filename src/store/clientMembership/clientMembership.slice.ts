import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  assignClientMembershipThunk,
  cancelClientMembershipThunk,
  changeClientMembershipThunk,
  fetchClientMembershipsThunk,
  fetchMembershipClientsThunk,
  renewClientMembershipThunk,
} from "@/middleware/clientMembership/clientMembership.thunk";
import type { RootState } from "@/store";
import type { ClientMembershipAssignment } from "@/types/clientMembership";

type ClientMembershipState = {
  byClientId: Record<string, ClientMembershipAssignment[]>;
  byMembershipId: Record<string, ClientMembershipAssignment[]>;
  clientErrors: Record<string, string | null>;
  clientLoading: Record<string, boolean>;
  membershipErrors: Record<string, string | null>;
  membershipLoading: Record<string, boolean>;
  mutationError: string | null;
  mutating: boolean;
};

const initialState: ClientMembershipState = {
  byClientId: {},
  byMembershipId: {},
  clientErrors: {},
  clientLoading: {},
  membershipErrors: {},
  membershipLoading: {},
  mutationError: null,
  mutating: false,
};

const upsertAssignment = (
  assignments: ClientMembershipAssignment[] | undefined,
  assignment: ClientMembershipAssignment,
) => {
  const current = assignments ?? [];
  const index = current.findIndex((item) => item.id === assignment.id);

  if (index === -1) {
    return [assignment, ...current];
  }

  return current.map((item) => (item.id === assignment.id ? assignment : item));
};

const upsertAssignmentEverywhere = (state: ClientMembershipState, assignment: ClientMembershipAssignment) => {
  if (assignment.clientId) {
    state.byClientId[assignment.clientId] = upsertAssignment(state.byClientId[assignment.clientId], assignment);
  }

  if (assignment.membershipId) {
    state.byMembershipId[assignment.membershipId] = upsertAssignment(
      state.byMembershipId[assignment.membershipId],
      assignment,
    );
  }
};

const finishMutationPayload = (state: ClientMembershipState, assignment: ClientMembershipAssignment) => {
  state.mutating = false;
  state.mutationError = null;
  upsertAssignmentEverywhere(state, assignment);
};

const clientMembershipSlice = createSlice({
  name: "clientMembership",
  initialState,
  reducers: {
    clearClientMembershipMutationError(state) {
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientMembershipsThunk.pending, (state, action) => {
        state.clientErrors[action.meta.arg] = null;
        state.clientLoading[action.meta.arg] = true;
      })
      .addCase(fetchClientMembershipsThunk.fulfilled, (state, action) => {
        state.byClientId[action.payload.clientId] = action.payload.assignments;
        state.clientErrors[action.payload.clientId] = null;
        state.clientLoading[action.payload.clientId] = false;

        action.payload.assignments.forEach((assignment) => upsertAssignmentEverywhere(state, assignment));
      })
      .addCase(fetchClientMembershipsThunk.rejected, (state, action) => {
        state.clientErrors[action.meta.arg] = action.payload?.message ?? "Unable to load client memberships.";
        state.clientLoading[action.meta.arg] = false;
      })
      .addCase(fetchMembershipClientsThunk.pending, (state, action) => {
        state.membershipErrors[action.meta.arg] = null;
        state.membershipLoading[action.meta.arg] = true;
      })
      .addCase(fetchMembershipClientsThunk.fulfilled, (state, action) => {
        state.byMembershipId[action.payload.membershipId] = action.payload.assignments;
        state.membershipErrors[action.payload.membershipId] = null;
        state.membershipLoading[action.payload.membershipId] = false;

        action.payload.assignments.forEach((assignment) => upsertAssignmentEverywhere(state, assignment));
      })
      .addCase(fetchMembershipClientsThunk.rejected, (state, action) => {
        state.membershipErrors[action.meta.arg] = action.payload?.message ?? "Unable to load membership clients.";
        state.membershipLoading[action.meta.arg] = false;
      })
      .addCase(assignClientMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutating = true;
      })
      .addCase(assignClientMembershipThunk.fulfilled, (state, action) => {
        finishMutationPayload(state, action.payload);
      })
      .addCase(assignClientMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to assign membership.";
        state.mutating = false;
      })
      .addCase(changeClientMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutating = true;
      })
      .addCase(changeClientMembershipThunk.fulfilled, (state, action) => {
        finishMutationPayload(state, action.payload);
      })
      .addCase(changeClientMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to change membership.";
        state.mutating = false;
      })
      .addCase(renewClientMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutating = true;
      })
      .addCase(renewClientMembershipThunk.fulfilled, (state, action) => {
        finishMutationPayload(state, action.payload);
      })
      .addCase(renewClientMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to renew membership.";
        state.mutating = false;
      })
      .addCase(cancelClientMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutating = true;
      })
      .addCase(cancelClientMembershipThunk.fulfilled, (state, action) => {
        finishMutationPayload(state, action.payload);
      })
      .addCase(cancelClientMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to cancel membership.";
        state.mutating = false;
      });
  },
});

export const { clearClientMembershipMutationError } = clientMembershipSlice.actions;

export const selectClientMembershipState = (state: RootState) => state.clientMembership;
export const selectClientMembershipMutating = (state: RootState) => state.clientMembership.mutating;
export const selectClientMembershipMutationError = (state: RootState) => state.clientMembership.mutationError;
export const selectClientMembershipsByClient = (clientId?: string) =>
  createSelector(selectClientMembershipState, (state) => (clientId ? state.byClientId[clientId] ?? [] : []));
export const selectClientMembershipsLoading = (clientId?: string) =>
  createSelector(selectClientMembershipState, (state) => Boolean(clientId && state.clientLoading[clientId]));
export const selectClientMembershipsError = (clientId?: string) =>
  createSelector(selectClientMembershipState, (state) => (clientId ? state.clientErrors[clientId] ?? null : null));
export const selectMembershipClients = (membershipId?: string) =>
  createSelector(selectClientMembershipState, (state) => (membershipId ? state.byMembershipId[membershipId] ?? [] : []));
export const selectMembershipClientsLoading = (membershipId?: string) =>
  createSelector(selectClientMembershipState, (state) => Boolean(membershipId && state.membershipLoading[membershipId]));
export const selectMembershipClientsError = (membershipId?: string) =>
  createSelector(selectClientMembershipState, (state) => (membershipId ? state.membershipErrors[membershipId] ?? null : null));
export const selectActiveClientMembership = (clientId?: string) =>
  createSelector(selectClientMembershipsByClient(clientId), (assignments) =>
    assignments.find((assignment) => assignment.status === "active") ?? null,
  );

export default clientMembershipSlice.reducer;
