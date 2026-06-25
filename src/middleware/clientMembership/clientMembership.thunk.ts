import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import type {
  ClientMembership,
  ClientMembershipsListResponse,
  ClientMembershipsListQuery,
  CreateClientMembershipDTO,
  ConsumeSessionDTO,
} from "../../services/api/endpoints/clientMemberships.endpoints";

const BASE = "/api/v1/client-memberships";

interface ApiResponse<T> { data: T; }

function toParams(query: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") out[k] = String(v);
  }
  return out;
}

export const fetchClientMembershipsThunk = createAsyncThunk<
  ClientMembershipsListResponse,
  ClientMembershipsListQuery | undefined,
  { rejectValue: string }
>(
  "clientMemberships/fetchAll",
  async (query = {}, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<ClientMembershipsListResponse>>(BASE, { params: toParams(query) });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Failed to fetch sold memberships");
    }
  }
);

export const fetchClientMembershipByIdThunk = createAsyncThunk<
  ClientMembership,
  string,
  { rejectValue: string }
>(
  "clientMemberships/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<ClientMembership>>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Failed to fetch membership");
    }
  }
);

export const purchaseClientMembershipThunk = createAsyncThunk<
  ClientMembership,
  CreateClientMembershipDTO,
  { rejectValue: string }
>(
  "clientMemberships/purchase",
  async (dto, { rejectWithValue }) => {
    try {
      const res = await api.post<ApiResponse<ClientMembership>>(BASE, dto);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Failed to purchase membership");
    }
  }
);

export const consumeSessionThunk = createAsyncThunk<
  ClientMembership,
  { id: string; dto: ConsumeSessionDTO },
  { rejectValue: string }
>(
  "clientMemberships/consume",
  async ({ id, dto }, { rejectWithValue }) => {
    try {
      const res = await api.patch<ApiResponse<ClientMembership>>(`${BASE}/${id}/consume`, dto);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Failed to consume session");
    }
  }
);

export const cancelClientMembershipThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "clientMemberships/cancel",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`${BASE}/${id}/cancel`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Failed to cancel membership");
    }
  }
);
