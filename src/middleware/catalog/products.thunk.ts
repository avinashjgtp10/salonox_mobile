import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { PRODUCTS, CATEGORIES } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";

const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export type FetchProductsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category_id?: string;
  brand_id?: string;
  stock?: string;
  product_type?: string;
  sort_by?: string;
  sort_order?: "ASC" | "DESC";
};

export const fetchProductsThunk = createAsyncThunk<
  { data: any[]; page: number; pageSize: number; totalRecords: number; totalPages: number },
  FetchProductsParams | void,
  { rejectValue: string }
>("products/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const res = await api.get(PRODUCTS.LIST, { params: params ?? {} });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch products.");
  }
});

// POST-body variant of fetchProductsThunk, backed by PRODUCTS.SEARCH — for
// callers that need to preload the full catalog (e.g. filter/picker dropdowns)
// with a pageSize above PRODUCTS.LIST's 100-row cap.
export const searchProductsThunk = createAsyncThunk<
  { data: any[]; page: number; pageSize: number; totalRecords: number; totalPages: number },
  FetchProductsParams | void,
  { rejectValue: string }
>("products/search", async (params, { rejectWithValue }) => {
  try {
    const res = await api.post(PRODUCTS.SEARCH, params ?? {});
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch products.");
  }
});

export const createProductThunk = createAsyncThunk<
  any,
  Record<string, any>,
  { rejectValue: string }
>("products/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(PRODUCTS.CREATE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      console.error("Backend validation error:", err.message, err.errors);
      let details = err.message;
      if (err.errors) {
        details += ": " + JSON.stringify(err.errors);
      }
      return rejectWithValue(details);
    }
    return rejectWithValue("Failed to create product.");
  }
});

export const updateProductThunk = createAsyncThunk<
  any,
  { id: string; data: Record<string, any> },
  { rejectValue: string }
>("products/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(PRODUCTS.UPDATE(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update product.");
  }
});

export const deleteProductThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("products/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(PRODUCTS.DELETE(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete product.");
  }
});

export const fetchBrandsThunk = createAsyncThunk<
  any[],
  void,
  { rejectValue: string }
>("products/fetchBrands", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(PRODUCTS.BRANDS);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch brands.");
  }
});

export const createBrandThunk = createAsyncThunk<
  any,
  { name: string },
  { rejectValue: string }
>("products/createBrand", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post(PRODUCTS.CREATE_BRAND, body);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create brand.");
  }
});

export const deleteBrandThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("products/deleteBrand", async (id, { rejectWithValue }) => {
  try {
    await api.delete(PRODUCTS.DELETE_BRAND(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete brand.");
  }
});

export type ExportProductsParams = Omit<FetchProductsParams, "page" | "pageSize">;

export const exportProductsCSVThunk = createAsyncThunk<
  void, ExportProductsParams | void, { rejectValue: string }
>("products/exportCSV", async (params, { rejectWithValue }) => {
  try {
    const res = await api.get(PRODUCTS.EXPORT_CSV, { params: params ?? {}, responseType: "blob" });
    downloadFile(res.data, "products.csv");
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export CSV.");
  }
});

export const exportProductsExcelThunk = createAsyncThunk<
  void, ExportProductsParams | void, { rejectValue: string }
>("products/exportExcel", async (params, { rejectWithValue }) => {
  try {
    const res = await api.get(PRODUCTS.EXPORT_EXCEL, { params: params ?? {}, responseType: "blob" });
    downloadFile(res.data, "products.xlsx");
  } catch (err: any) {
    const msg = err instanceof ApiError ? err.message : "Failed to export Excel.";
    // A permission denial (403) already shows the global "Permission
    // Required" popup (see interceptors.ts) — alerting here too would stack
    // a jarring native alert() on top of it for that one case. Every other
    // failure (network, 500, etc.) still alerts exactly as before.
    if (!(err instanceof ApiError && err.status === 403)) alert("Export Excel failed: " + msg);
    return rejectWithValue(msg);
  }
});

export const exportProductsPDFThunk = createAsyncThunk<
  void, ExportProductsParams | void, { rejectValue: string }
>("products/exportPDF", async (params, { rejectWithValue }) => {
  try {
    const res = await api.get(PRODUCTS.EXPORT_PDF, { params: params ?? {}, responseType: "blob" });
    downloadFile(res.data, "products.pdf");
  } catch (err: any) {
    const msg = err instanceof ApiError ? err.message : "Failed to export PDF.";
    if (!(err instanceof ApiError && err.status === 403)) alert("Export PDF failed: " + msg);
    return rejectWithValue(msg);
  }
});

// ── Categories ────────────────────────────────────────────────────────────────
export const fetchCategoriesThunk = createAsyncThunk<
  any[],
  void,
  { rejectValue: string }
>("products/fetchCategories", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(CATEGORIES.LIST);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch categories.");
  }
});

export const createCategoryThunk = createAsyncThunk<
  any,
  { name: string; type?: "service" | "product" | "both" },
  { rejectValue: string }
>("products/createCategory", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post(CATEGORIES.CREATE, body);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create category.");
  }
});

export const deleteCategoryThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("products/deleteCategory", async (id, { rejectWithValue }) => {
  try {
    await api.delete(CATEGORIES.DELETE(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete category.");
  }
});
