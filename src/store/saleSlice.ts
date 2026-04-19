import { castDraft } from "immer";
import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Sale } from "../types/sale.types";
import {
  fetchSalesThunk,
  fetchSaleByIdThunk,
  fetchSaleSummaryThunk,
  createSaleThunk,
  updateSaleThunk,
  deleteSaleThunk,
  exportSalesThunk,
  checkoutSaleThunk,
} from "../middleware/sale/sale.thunk";

const saleSlice = createCRUDSlice<Sale>({
  name: "sale",
  thunks: {
    fetchAllThunk: fetchSalesThunk,
    fetchByIdThunk: fetchSaleByIdThunk,
    createThunk: createSaleThunk,
    updateThunk: updateSaleThunk,
    deleteThunk: deleteSaleThunk,
    exportThunk: exportSalesThunk,
  },
  extraInitialLoading: {
    checkout: false,
    summary: false,
  },
  extraReducers: (builder) => {
    // ── Summary ──────────────────────────────────────────────────────────────
    builder
      .addCase(fetchSaleSummaryThunk.pending, (state) => {
        state.loading.summary = true;
        state.error = null;
      })
      .addCase(fetchSaleSummaryThunk.fulfilled, (state, { payload }) => {
        state.loading.summary = false;
        (state as any).summary = payload;
      })
      .addCase(fetchSaleSummaryThunk.rejected, (state, { payload }) => {
        state.loading.summary = false;
        // summary failure is non-critical; keep existing data
        state.error = (payload as string) ?? "Failed to fetch summary";
      });

    // ── Checkout ─────────────────────────────────────────────────────────────
    builder
      .addCase(checkoutSaleThunk.pending, (state) => {
        state.loading.checkout = true;
        state.error = null;
      })
      .addCase(checkoutSaleThunk.fulfilled, (state, { payload }) => {
        state.loading.checkout = false;
        const idx = state.items.findIndex((i) => i.id === payload.id);
        if (idx !== -1) {
          state.items[idx] = castDraft(payload);
        } else {
          state.items.unshift(castDraft(payload));
        }
      })
      .addCase(checkoutSaleThunk.rejected, (state, { payload }) => {
        state.loading.checkout = false;
        state.error = (payload as string) ?? "Checkout failed";
      });
  },
});

export const {
  clearError: clearSaleError,
  clearSelectedItem: clearSelectedSale,
} = saleSlice.actions;

export default saleSlice.reducer;
