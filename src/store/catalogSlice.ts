import { createSlice } from "@reduxjs/toolkit";
import type { CatalogItem } from "../types/catalog.types";
import {
  fetchCatalogThunk,
  fetchCatalogByIdThunk,
  createCatalogThunk,
  updateCatalogThunk,
  deleteCatalogThunk,
  exportCatalogThunk,
} from "../middleware/catalog/catalog.thunk";

export interface CatalogState {
  items:         CatalogItem[];
  selectedItem:  CatalogItem | null;
  loading:       boolean;
  error:         string | null;
}

const initialState: CatalogState = {
  items:         [],
  selectedItem:  null,
  loading:       false,
  error:         null,
}

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    clearCatalogError(state) {
      state.error = null;
    },
    clearSelectedCatalogItem(state) {
      state.selectedItem = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchCatalogThunk ─────────────────────────────────────────────────────
    builder
      .addCase(fetchCatalogThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchCatalogThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items   = payload;
      })
      .addCase(fetchCatalogThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch catalog items";
      })

    // ── fetchCatalogByIdThunk ─────────────────────────────────────────────────
    builder
      .addCase(fetchCatalogByIdThunk.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.selectedItem   = null;
      })
      .addCase(fetchCatalogByIdThunk.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.selectedItem   = payload;
      })
      .addCase(fetchCatalogByIdThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch catalog item";
      })

    // ── createCatalogThunk ────────────────────────────────────────────────────
    builder
      .addCase(createCatalogThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createCatalogThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items.push(payload);
      })
      .addCase(createCatalogThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to create catalog item";
      })

    // ── updateCatalogThunk ────────────────────────────────────────────────────
    builder
      .addCase(updateCatalogThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateCatalogThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.items.findIndex((i) => i.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(updateCatalogThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to update catalog item";
      })

    // ── deleteCatalogThunk ────────────────────────────────────────────────────
    builder
      .addCase(deleteCatalogThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteCatalogThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.items   = state.items.filter((i) => i.id !== payload);
      })
      .addCase(deleteCatalogThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to delete catalog item";
      })

    // ── exportCatalogThunk ────────────────────────────────────────────────────
    builder
      .addCase(exportCatalogThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(exportCatalogThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportCatalogThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to export catalog";
      })
  },
})

export const { clearCatalogError, clearSelectedCatalogItem } = catalogSlice.actions;
export default catalogSlice.reducer;
