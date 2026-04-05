import { createSlice } from "@reduxjs/toolkit";
import type { Sale } from "../types/sale.types";
import {
  fetchSalesThunk,
  fetchSaleByIdThunk,
  createSaleThunk,
  updateSaleThunk,
  deleteSaleThunk,
  exportSalesThunk,
} from "../middleware/sale/sale.thunk";

export interface SaleState {
  sales:         Sale[];
  selectedSale:  Sale | null;
  loading:       boolean;
  error:         string | null;
}

const initialState: SaleState = {
  sales:         [],
  selectedSale:  null,
  loading:       false,
  error:         null,
}

const saleSlice = createSlice({
  name: "sale",
  initialState,
  reducers: {
    clearSaleError(state) {
      state.error = null;
    },
    clearSelectedSale(state) {
      state.selectedSale = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchSalesThunk ───────────────────────────────────────────────────────
    builder
      .addCase(fetchSalesThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchSalesThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.sales   = payload;
      })
      .addCase(fetchSalesThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch sales";
      })

    // ── fetchSaleByIdThunk ───────────────────────────────────────────────────
    builder
      .addCase(fetchSaleByIdThunk.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.selectedSale   = null;
      })
      .addCase(fetchSaleByIdThunk.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.selectedSale   = payload;
      })
      .addCase(fetchSaleByIdThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch sale";
      })

    // ── createSaleThunk ──────────────────────────────────────────────────────
    builder
      .addCase(createSaleThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createSaleThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.sales.push(payload);
      })
      .addCase(createSaleThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to create sale";
      })

    // ── updateSaleThunk ──────────────────────────────────────────────────────
    builder
      .addCase(updateSaleThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateSaleThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.sales.findIndex((s) => s.id === payload.id);
        if (idx !== -1) state.sales[idx] = payload;
      })
      .addCase(updateSaleThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to update sale";
      })

    // ── deleteSaleThunk ──────────────────────────────────────────────────────
    builder
      .addCase(deleteSaleThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteSaleThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.sales   = state.sales.filter((s) => s.id !== payload);
      })
      .addCase(deleteSaleThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to delete sale";
      })

    // ── exportSalesThunk ──────────────────────────────────────────────────────
    builder
      .addCase(exportSalesThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(exportSalesThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportSalesThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to export sales";
      })
  },
})

export const { clearSaleError, clearSelectedSale } = saleSlice.actions;
export default saleSlice.reducer;
