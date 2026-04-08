import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExportFormat = "excel" | "csv";

/** Minimal shape every entity must satisfy so the factory can type-check. */
export interface WithId {
  id: string | number;
}

/**
 * Endpoint descriptor passed to createCRUDThunks.
 * Each property mirrors the same shape used in endpoints/*.ts files.
 */
export interface CRUDEndpoints {
  BASE: string;
  BY_ID: (id: string | number) => string;
  EXPORT?: (format: ExportFormat) => string;
}

/**
 * Standard server-envelope shapes (single vs. list).
 * Your axios interceptors may already unwrap these – adjust if needed.
 */
export interface SingleEnvelope<T> {
  data: T;
}
export interface ListEnvelope<T> {
  data: T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Update payload – every entity uses { id, data } for PUT requests
// ─────────────────────────────────────────────────────────────────────────────
export interface UpdatePayload<TData> {
  id: string | number;
  data: TData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a set of five standard async thunks for a domain entity.
 *
 * @param domain     Redux action-type prefix, e.g. "catalog"
 * @param endpoints  Endpoint descriptor (BASE, BY_ID, optional EXPORT)
 * @param entityName Human-readable name used in fallback error messages
 *
 * Usage:
 * ```ts
 * export const {
 *   fetchAllThunk, fetchByIdThunk, createThunk, updateThunk, deleteThunk, exportThunk,
 * } = createCRUDThunks<CatalogItem, CreateCatalogPayload, UpdateCatalogData>(
 *   "catalog", CATALOG, "catalog item"
 * );
 * ```
 */
export function createCRUDThunks<
  TEntity extends WithId,
  TCreatePayload = Partial<TEntity>,
  TUpdateData = Partial<TEntity>,
>(domain: string, endpoints: CRUDEndpoints, entityName: string) {
  // ── Fetch all ──────────────────────────────────────────────────────────────
  const fetchAllThunk = createAsyncThunk<
    TEntity[],
    void,
    { rejectValue: string }
  >(`${domain}/fetchAll`, async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<ListEnvelope<TEntity>>(endpoints.BASE);
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to fetch ${entityName}s`);
    }
  });

  // ── Fetch by ID ────────────────────────────────────────────────────────────
  const fetchByIdThunk = createAsyncThunk<
    TEntity,
    string | number,
    { rejectValue: string }
  >(`${domain}/fetchById`, async (id, { rejectWithValue }) => {
    try {
      const res = await api.get<SingleEnvelope<TEntity>>(endpoints.BY_ID(id));
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to fetch ${entityName}`);
    }
  });

  // ── Create ─────────────────────────────────────────────────────────────────
  const createThunk = createAsyncThunk<
    TEntity,
    TCreatePayload,
    { rejectValue: string }
  >(`${domain}/create`, async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<SingleEnvelope<TEntity>>(
        endpoints.BASE,
        payload,
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to create ${entityName}`);
    }
  });

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateThunk = createAsyncThunk<
    TEntity,
    UpdatePayload<TUpdateData>,
    { rejectValue: string }
  >(`${domain}/update`, async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put<SingleEnvelope<TEntity>>(
        endpoints.BY_ID(id),
        data,
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to update ${entityName}`);
    }
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteThunk = createAsyncThunk<
    string | number,
    string | number,
    { rejectValue: string }
  >(`${domain}/delete`, async (id, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.BY_ID(id));
      return id;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to delete ${entityName}`);
    }
  });

  // ── Export (optional) ──────────────────────────────────────────────────────
  const exportThunk = createAsyncThunk<
    void,
    ExportFormat,
    { rejectValue: string }
  >(`${domain}/export`, async (format, { rejectWithValue }) => {
    if (!endpoints.EXPORT) {
      return rejectWithValue(`Export not supported for ${entityName}`);
    }
    try {
      const res = await api.get(endpoints.EXPORT(format), {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${domain}.${format === "excel" ? "xlsx" : "csv"}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to export ${entityName}s`);
    }
  });

  return {
    fetchAllThunk,
    fetchByIdThunk,
    createThunk,
    updateThunk,
    deleteThunk,
    exportThunk,
  } as const;
}
