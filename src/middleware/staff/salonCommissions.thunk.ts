import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { salonCommissionsService } from "@/services/salonCommissions.service";
import type { RootState } from "@/store";
import type {
  BulkConfigureCommissionsRequest,
  BulkConfigureCommissionsResponse,
  ExportCommissionsResponse,
  MarkCommissionPaidResponse,
  SalonCommissionListResponse,
  SalonCommissionSummary,
  SalonEarnedEntry,
} from "@/types/salonCommissions";

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

export const fetchSalonCommissionSummaryThunk = createAsyncThunk<
  SalonCommissionSummary,
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchSummary", async (_args, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getSummary();
  } catch (error) {
    console.error("[SalonCommissions] Fetch summary failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSalonCommissionEarnedThunk = createAsyncThunk<
  SalonEarnedEntry[],
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchEarned", async (_args, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getEarned();
  } catch (error) {
    console.error("[SalonCommissions] Fetch earned failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export type FetchSalonCommissionsArgs = {
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  status?: string;
};

export const fetchSalonCommissionsThunk = createAsyncThunk<
  SalonCommissionListResponse,
  FetchSalonCommissionsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchAll", async (args, { getState, rejectWithValue }) => {
  const currentQuery = getState().salonCommissions.query;
  const nextQuery = {
    limit: args?.limit ?? currentQuery.limit,
    offset: args?.offset ?? currentQuery.offset,
    search: args?.search ?? currentQuery.search,
    status: args?.status ?? currentQuery.status,
  };

  try {
    return await salonCommissionsService.getAll(nextQuery);
  } catch (error) {
    console.error("[SalonCommissions] Fetch all failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const markCommissionPaidThunk = createAsyncThunk<
  MarkCommissionPaidResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/markPaid", async (staffId, { dispatch, rejectWithValue }) => {
  try {
    const response = await salonCommissionsService.markPaid(staffId);

    void dispatch(fetchSalonCommissionSummaryThunk());

    return response;
  } catch (error) {
    console.error("[SalonCommissions] Mark paid failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const bulkConfigureCommissionsThunk = createAsyncThunk<
  BulkConfigureCommissionsResponse,
  BulkConfigureCommissionsRequest,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/bulkConfigure", async (payload, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.bulkConfigure(payload);
  } catch (error) {
    console.error("[SalonCommissions] Bulk configure failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const exportSalonCommissionsThunk = createAsyncThunk<
  ExportCommissionsResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/export", async (_args, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.exportCommissions();
  } catch (error) {
    console.error("[SalonCommissions] Export failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});
