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
  fetchSaleInitThunk,
  fetchSaleProductsThunk,
  fetchSaleMembershipsThunk,
  type SaleInitData,
} from "../middleware/sale/sale.thunk";

const saleSlice = createCRUDSlice<Sale>({
  name: "sale",
  thunks: {
    fetchAllThunk:  fetchSalesThunk,
    fetchByIdThunk: fetchSaleByIdThunk,
    createThunk:    createSaleThunk,
    updateThunk:    updateSaleThunk,
    deleteThunk:    deleteSaleThunk,
    exportThunk:    exportSalesThunk,
  },
  extraInitialLoading: {
    checkout:    false,
    summary:     false,
    // Quick-sale catalog loading flags (one per catalog type)
    init:        false,
    products:    false,
    memberships: false,
  },
  extraReducers: (builder) => {

    // ── Init data (staff + services) ─────────────────────────────────────────
    // initLoaded = true after first successful fetch; re-fetch when salon changes
    builder
      .addCase(fetchSaleInitThunk.pending, (state) => {
        state.loading.init = true;
      })
      .addCase(fetchSaleInitThunk.fulfilled, (state, { payload }) => {
        state.loading.init = false;
        (state as any).initData           = payload as SaleInitData;
        (state as any).initLoaded         = true;
        (state as any).initLoadedForSalon = payload._salonId ?? "";
      })
      .addCase(fetchSaleInitThunk.rejected, (state) => {
        state.loading.init = false;
        // Keep initLoaded = false so a retry is possible on next visit
      });

    // ── Products catalog ──────────────────────────────────────────────────────
    // productsLoaded = true after first successful fetch
    builder
      .addCase(fetchSaleProductsThunk.pending, (state) => {
        state.loading.products = true;
      })
      .addCase(fetchSaleProductsThunk.fulfilled, (state, { payload }) => {
        state.loading.products      = false;
        (state as any).catalogProducts  = payload;
        (state as any).productsLoaded   = true;
      })
      .addCase(fetchSaleProductsThunk.rejected, (state) => {
        state.loading.products = false;
      });

    // ── Memberships catalog ───────────────────────────────────────────────────
    // membershipsLoaded = true after first successful fetch
    builder
      .addCase(fetchSaleMembershipsThunk.pending, (state) => {
        state.loading.memberships = true;
      })
      .addCase(fetchSaleMembershipsThunk.fulfilled, (state, { payload }) => {
        state.loading.memberships       = false;
        (state as any).catalogMemberships   = payload;
        (state as any).membershipsLoaded    = true;
      })
      .addCase(fetchSaleMembershipsThunk.rejected, (state) => {
        state.loading.memberships = false;
      });

    // ── Summary ───────────────────────────────────────────────────────────────
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
        state.error = (payload as string) ?? "Failed to fetch summary";
      });

    // ── Checkout ──────────────────────────────────────────────────────────────
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
