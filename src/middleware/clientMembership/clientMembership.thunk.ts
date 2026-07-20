import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchClientByIdThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchMembershipByIdThunk, fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { getApiErrorMessage } from "@/services/api";
import { clientMembershipService } from "@/services/clientMembership.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  CancelClientMembershipRequest,
  ChangeClientMembershipRequest,
  ClientMembershipAssignment,
  ClientMembershipAssignmentRequest,
  RenewClientMembershipRequest,
} from "@/types/clientMembership";

type RejectValue = {
  message: string;
};

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

const refreshAssignmentSurfaces = (
  dispatch: (action: unknown) => unknown,
  assignment: ClientMembershipAssignment,
) => {
  if (assignment.clientId) {
    void dispatch(fetchClientByIdThunk(assignment.clientId));
    void dispatch(fetchClientMembershipsThunk(assignment.clientId));
  }

  if (assignment.membershipId) {
    void dispatch(fetchMembershipByIdThunk(assignment.membershipId));
    void dispatch(fetchMembershipClientsThunk(assignment.membershipId));
  }

  void dispatch(fetchMembershipsThunk({ refresh: true }));
  void dispatch(fetchDashboardThunk());
};

export const fetchClientMembershipsThunk = createAsyncThunk<
  { assignments: ClientMembershipAssignment[]; clientId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/fetchClientMemberships", async (clientId, { getState, rejectWithValue }) => {
  try {
    const assignments = await clientMembershipService.getClientAssignments(clientId, selectActiveBranchId(getState()));

    return { assignments, clientId };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchMembershipClientsThunk = createAsyncThunk<
  { assignments: ClientMembershipAssignment[]; membershipId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/fetchMembershipClients", async (membershipId, { getState, rejectWithValue }) => {
  try {
    const assignments = await clientMembershipService.getMembershipClients(membershipId, selectActiveBranchId(getState()));

    return { assignments, membershipId };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const assignClientMembershipThunk = createAsyncThunk<
  ClientMembershipAssignment,
  ClientMembershipAssignmentRequest,
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/assign", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    const assignment = await clientMembershipService.assign(payload, selectActiveBranchId(getState()));
    refreshAssignmentSurfaces(dispatch, assignment);

    return assignment;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const changeClientMembershipThunk = createAsyncThunk<
  ClientMembershipAssignment,
  { assignmentId: string; data: ChangeClientMembershipRequest },
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/change", async ({ assignmentId, data }, { dispatch, getState, rejectWithValue }) => {
  try {
    const assignment = await clientMembershipService.change(assignmentId, data, selectActiveBranchId(getState()));
    refreshAssignmentSurfaces(dispatch, assignment);

    return assignment;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const renewClientMembershipThunk = createAsyncThunk<
  ClientMembershipAssignment,
  { assignmentId: string; data?: RenewClientMembershipRequest },
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/renew", async ({ assignmentId, data }, { dispatch, rejectWithValue }) => {
  try {
    const assignment = await clientMembershipService.renew(assignmentId, data);
    refreshAssignmentSurfaces(dispatch, assignment);

    return assignment;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const cancelClientMembershipThunk = createAsyncThunk<
  ClientMembershipAssignment,
  { assignmentId: string; data?: CancelClientMembershipRequest },
  { rejectValue: RejectValue; state: RootState }
>("clientMembership/cancel", async ({ assignmentId, data }, { dispatch, rejectWithValue }) => {
  try {
    const assignment = await clientMembershipService.cancel(assignmentId, data);
    refreshAssignmentSurfaces(dispatch, assignment);

    return assignment;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
