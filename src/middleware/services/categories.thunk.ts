import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { CATEGORIES } from "../../services/api/endpoints/categories.endpoints";
import { ApiError } from "../../services/api/interceptors";

/**
 * Backend category shape (service_categories table):
 *   id, salon_id, name, description, display_order, is_active, created_at
 *
 * Response envelope: { success, data: <payload>, message }
 * List: data = ServiceCategory[]
 * Single: data = ServiceCategory
 */

/** Which side(s) of the catalog a category applies to. */
export type CategoryType = "service" | "product" | "both";

export interface CategoryEntity {
  id: string | number;
  name: string;
  description?: string | null;
  color?: string | null;
  display_order?: number;
  is_active?: boolean;
  salon_id?: string;
  created_at?: string;
  /** Older cached entries fetched before this field existed won't have it —
   *  treat missing as unknown, not as excluded from either picker. */
  type?: CategoryType;
}

// ── Fetch all categories ──────────────────────────────────────────────────────
export const fetchCategoriesThunk = createAsyncThunk<
  CategoryEntity[],
  void,
  { rejectValue: string }
>("categories/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(CATEGORIES.BASE);
    // res.data = { success, data: CategoryEntity[], message }
    const payload = (res.data as any)?.data;
    return (Array.isArray(payload) ? payload : []) as CategoryEntity[];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch categories");
  }
});

// ── Fetch single category ─────────────────────────────────────────────────────
export const fetchCategoryByIdThunk = createAsyncThunk<
  CategoryEntity,
  string | number,
  { rejectValue: string }
>("categories/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(CATEGORIES.BY_ID(id));
    return (res.data as any).data as CategoryEntity;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch category");
  }
});

// ── Create category ───────────────────────────────────────────────────────────
export const createCategoryThunk = createAsyncThunk<
  CategoryEntity,
  { name: string; description?: string; color?: string; type?: CategoryType },
  { rejectValue: string }
>("categories/create", async ({ name, description, color, type }, { rejectWithValue }) => {
  try {
    const res = await api.post(CATEGORIES.BASE, { name, description, ...(color ? { color } : {}), ...(type ? { type } : {}) });
    return (res.data as any).data as CategoryEntity;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create category");
  }
});

// ── Update category (backend uses PATCH) ──────────────────────────────────────
export const updateCategoryThunk = createAsyncThunk<
  CategoryEntity,
  { id: string | number; data: Partial<CategoryEntity> },
  { rejectValue: string }
>("categories/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(CATEGORIES.BY_ID(id), data);
    return (res.data as any).data as CategoryEntity;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update category");
  }
});

// ── Delete category ───────────────────────────────────────────────────────────
export const deleteCategoryThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("categories/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(CATEGORIES.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete category");
  }
});

// ── Export stub (required by createCRUDSlice) ─────────────────────────────────
export const exportCategoriesThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("categories/export", async (_format, { rejectWithValue }) => {
  return rejectWithValue("Export not supported for categories");
});
