import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import type { Package, CreatePackageDTO, UpdatePackageDTO, PackagesListResponse, PackagesListQuery } from "../../services/api/endpoints/packages.endpoints";

const BASE_URL = "/api/v1/packages";

const downloadBlob = (data: any, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// GET /api/v1/packages
export const fetchPackagesThunk = createAsyncThunk<
  PackagesListResponse,
  PackagesListQuery | undefined,
  { rejectValue: string }
>(
  "packages/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get(BASE_URL, { params });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch packages");
    }
  }
);

// GET /api/v1/packages/:id
export const fetchPackageByIdThunk = createAsyncThunk<
  Package,
  string,
  { rejectValue: string }
>(
  "packages/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch package");
    }
  }
);

// POST /api/v1/packages
export const createPackageThunk = createAsyncThunk<
  Package,
  CreatePackageDTO,
  { rejectValue: string }
>(
  "packages/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post(BASE_URL, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to create package");
    }
  }
);

// PATCH /api/v1/packages/:id
export const updatePackageThunk = createAsyncThunk<
  Package,
  { id: string; data: UpdatePackageDTO },
  { rejectValue: string }
>(
  "packages/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`${BASE_URL}/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to update package");
    }
  }
);

// DELETE /api/v1/packages/:id
export const deletePackageThunk = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>(
  "packages/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete package");
    }
  }
);

// GET /api/v1/packages/export/csv
export const exportPackagesCsvThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>(
  "packages/exportCsv",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${BASE_URL}/export/csv`, { responseType: "blob" });
      downloadBlob(res.data, `packages_${Date.now()}.csv`);
    } catch (error: any) {
      return rejectWithValue("Failed to export packages to CSV");
    }
  }
);

// GET /api/v1/packages/export/pdf
export const exportPackagesPdfThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>(
  "packages/exportPdf",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${BASE_URL}/export/pdf`, { responseType: "blob" });
      downloadBlob(res.data, `packages_${Date.now()}.pdf`);
    } catch (error: any) {
      return rejectWithValue("Failed to export packages to PDF");
    }
  }
);

// GET /api/v1/packages/export/excel
export const exportPackagesExcelThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>(
  "packages/exportExcel",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`${BASE_URL}/export/excel`, { responseType: "blob" });
      downloadBlob(res.data, `packages_${Date.now()}.xlsx`);
    } catch (error: any) {
      return rejectWithValue("Failed to export packages to Excel");
    }
  }
);
