import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffCommissionsService } from "@/services/staffCommissions.service";
import type { RootState } from "@/store";
import type {
  CommissionHistoryEntry,
  CommissionSettings,
  CommissionSlab,
  UpdateCommissionSettingsRequest,
  UpdateCommissionSettingsResponse,
  UpdateCommissionSlabsRequest,
  UpdateCommissionSlabsResponse,
} from "@/types/staffCommissions";

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

export const fetchCommissionSettingsThunk = createAsyncThunk<
  { commission: CommissionSettings; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/fetchSettings", async (staffId, { rejectWithValue }) => {
  try {
    const commission = await staffCommissionsService.getCommissionSettings(staffId);

    return { commission, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Fetch settings failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateCommissionSettingsThunk = createAsyncThunk<
  UpdateCommissionSettingsResponse & { staffId: string },
  { staffId: string; updates: UpdateCommissionSettingsRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/updateSettings", async ({ staffId, updates }, { rejectWithValue }) => {
  try {
    const response = await staffCommissionsService.updateCommissionSettings(staffId, updates);

    return { ...response, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Update settings failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchCommissionSlabsThunk = createAsyncThunk<
  { slabs: CommissionSlab[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/fetchSlabs", async (staffId, { rejectWithValue }) => {
  try {
    const slabs = await staffCommissionsService.getCommissionSlabs(staffId);

    return { slabs, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Fetch slabs failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateCommissionSlabsThunk = createAsyncThunk<
  UpdateCommissionSlabsResponse & { staffId: string },
  { staffId: string; updates: UpdateCommissionSlabsRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/updateSlabs", async ({ staffId, updates }, { rejectWithValue }) => {
  try {
    const response = await staffCommissionsService.updateCommissionSlabs(staffId, updates);

    return { ...response, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Update slabs failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchCommissionHistoryThunk = createAsyncThunk<
  { history: CommissionHistoryEntry[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/fetchHistory", async (staffId, { rejectWithValue }) => {
  try {
    const history = await staffCommissionsService.getCommissionHistory(staffId);

    return { history, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Fetch history failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
