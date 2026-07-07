import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffInvitationsService } from "@/services/staffInvitations.service";
import type { RootState } from "@/store";
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  CancelInviteResponse,
  InvitationStatus,
  ResendInviteResponse,
  VerifyInviteResult,
} from "@/types/staffInvitations";

type RejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): RejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

export const fetchInvitationStatusThunk = createAsyncThunk<
  { staffId: string; status: InvitationStatus },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffInvitations/fetchStatus", async (staffId, { rejectWithValue }) => {
  try {
    const status = await staffInvitationsService.getInvitationStatus(staffId);

    return { staffId, status };
  } catch (error) {
    console.error("[StaffInvitations] Fetch status failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const resendInviteThunk = createAsyncThunk<
  ResendInviteResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffInvitations/resend", async (staffId, { rejectWithValue }) => {
  try {
    return await staffInvitationsService.resendInvite(staffId);
  } catch (error) {
    console.error("[StaffInvitations] Resend failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const cancelInviteThunk = createAsyncThunk<
  CancelInviteResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffInvitations/cancel", async (staffId, { rejectWithValue }) => {
  try {
    return await staffInvitationsService.cancelInvite(staffId);
  } catch (error) {
    console.error("[StaffInvitations] Cancel failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const verifyInviteTokenThunk = createAsyncThunk<
  VerifyInviteResult,
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffInvitations/verifyToken", async (token, { rejectWithValue }) => {
  try {
    return await staffInvitationsService.verifyInviteToken(token);
  } catch (error) {
    console.error("[StaffInvitations] Verify token failed", { ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const acceptInviteThunk = createAsyncThunk<
  AcceptInviteResponse,
  AcceptInviteRequest,
  { rejectValue: RejectValue; state: RootState }
>("staffInvitations/accept", async (payload, { rejectWithValue }) => {
  try {
    return await staffInvitationsService.acceptInvite(payload);
  } catch (error) {
    console.error("[StaffInvitations] Accept failed", { ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
