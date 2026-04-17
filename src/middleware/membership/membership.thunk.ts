import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  CreateMembershipDTO,
  UpdateMembershipDTO,
  MembershipsListQuery,
  Membership,
  MembershipsListResponse,
  ApiResponse,
} from "../../services/api/endpoints/memberships.endpoints";

const BASE_URL = "/api/v1/memberships";

function cleanParams(query: MembershipsListQuery & { search?: string }) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "" && v !== "Any period" && v !== "any") {
      params[k] = String(v);
    }
  }
  return params;
}

// GET /api/v1/memberships
export const fetchMembershipsThunk = createAsyncThunk<
  MembershipsListResponse,
  MembershipsListQuery | undefined,
  { rejectValue: string }
>(
  "memberships/fetchAll",
  async (query = {}, { rejectWithValue }) => {
    try {
      const params = cleanParams(query);
      const res = await api.get<ApiResponse<MembershipsListResponse>>(BASE_URL, { params });
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch memberships");
    }
  }
);

// GET /api/v1/memberships/:id
export const fetchMembershipByIdThunk = createAsyncThunk<
  Membership,
  string,
  { rejectValue: string }
>(
  "memberships/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<Membership>>(`${BASE_URL}/${id}`);
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch membership");
    }
  }
);

// POST /api/v1/memberships
export const createMembershipThunk = createAsyncThunk<
  Membership,
  CreateMembershipDTO,
  { rejectValue: string }
>(
  "memberships/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post<ApiResponse<Membership>>(BASE_URL, data);
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to create membership");
    }
  }
);

// PATCH /api/v1/memberships/:id
export const updateMembershipThunk = createAsyncThunk<
  Membership,
  { id: string; data: UpdateMembershipDTO },
  { rejectValue: string }
>(
  "memberships/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch<ApiResponse<Membership>>(`${BASE_URL}/${id}`, data);
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to update membership");
    }
  }
);

// DELETE /api/v1/memberships/:id
export const deleteMembershipThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "memberships/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
      return id;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to delete membership");
    }
  }
);

// GET /api/v1/memberships/export/csv
export const exportMembershipsCsvThunk = createAsyncThunk<
  void,
  MembershipsListQuery | undefined,
  { rejectValue: string }
>(
  "memberships/exportCsv",
  async (query = {}, { rejectWithValue }) => {
    try {
      const params = cleanParams(query);
      const res = await api.get(`${BASE_URL}/export/csv`, {
        params,
        responseType: "blob",
      });
      downloadBlob(res.data, `memberships_${Date.now()}.csv`);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("CSV export failed");
    }
  }
);

// GET /api/v1/memberships/export/pdf
export const exportMembershipsPdfThunk = createAsyncThunk<
  void,
  MembershipsListQuery | undefined,
  { rejectValue: string }
>(
  "memberships/exportPdf",
  async (query = {}, { rejectWithValue }) => {
    try {
      const params = cleanParams(query);
      const res = await api.get(`${BASE_URL}/export/pdf`, {
        params,
        responseType: "blob",
      });
      downloadBlob(res.data, `memberships_${Date.now()}.pdf`);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("PDF export failed");
    }
  }
);

// GET /api/v1/memberships/export/excel
export const exportMembershipsExcelThunk = createAsyncThunk<
  void,
  MembershipsListQuery | undefined,
  { rejectValue: string }
>(
  "memberships/exportExcel",
  async (query = {}, { rejectWithValue }) => {
    try {
      const params = cleanParams(query);
      const res = await api.get(`${BASE_URL}/export/excel`, {
        params,
        responseType: "blob",
      });
      downloadBlob(res.data, `memberships_${Date.now()}.xlsx`);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Excel export failed");
    }
  }
);