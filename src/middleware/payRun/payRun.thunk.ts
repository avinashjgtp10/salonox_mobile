import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { PAY_RUNS } from "../../services/api/endpoints/payRun.endpoints";
import type { PayRun, PayRunSummary, PayRunResponse, SinglePayRunResponse } from "../../types/payRun.types";
import { ApiError } from "../../services/api/interceptors";

export const fetchPayRunsThunk = createAsyncThunk<
  { items: PayRun[]; summary: PayRunSummary; total: number },
  { search?: string; startDate?: string; endDate?: string; page?: number; limit?: number },
  { rejectValue: string }
>("payRun/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<PayRunResponse>(PAY_RUNS.BASE, { params });
    return {
      items: response.data.data.items,
      summary: response.data.data.summary,
      total: response.data.data.total,
    };
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch pay runs");
  }
});

export const fetchPayRunByIdThunk = createAsyncThunk<
  PayRun,
  string | number,
  { rejectValue: string }
>("payRun/fetchById", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get<SinglePayRunResponse>(PAY_RUNS.BY_ID(id));
    return response.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch pay run details");
  }
});

export const createPayRunThunk = createAsyncThunk<
  PayRun,
  Partial<PayRun>,
  { rejectValue: string }
>("payRun/create", async (data, { rejectWithValue }) => {
  try {
    const response = await api.post<SinglePayRunResponse>(PAY_RUNS.BASE, data);
    return response.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create pay run");
  }
});

export const updatePayRunThunk = createAsyncThunk<
  PayRun,
  { id: string | number; data: Partial<PayRun> },
  { rejectValue: string }
>("payRun/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put<SinglePayRunResponse>(PAY_RUNS.BY_ID(id), data);
    return response.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update pay run");
  }
});

export const deletePayRunThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("payRun/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(PAY_RUNS.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete pay run");
  }
});
