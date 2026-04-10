import { castDraft } from "immer";
import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Sale } from "../types/sale.types";
import {
  fetchSalesThunk,
  fetchSaleByIdThunk,
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
  // extra loading flag for checkout operation
  extraInitialLoading: {
    checkout: false,
  },
  // handle checkoutSaleThunk — updates the sale in the list (draft → completed)
  extraReducers: (builder) => {
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
