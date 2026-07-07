import { createSlice } from "@reduxjs/toolkit";

import {
  checkoutSaleThunk,
  createSaleThunk,
  deleteSaleThunk,
  exportSalesThunk,
  fetchSaleByIdThunk,
  fetchSalesInitThunk,
  fetchSalesSummaryThunk,
  fetchSalesThunk,
  updateSaleThunk,
  type FetchSalesArgs,
} from "@/middleware/sales/sales.thunk";
import type { RootState } from "@/store";
import type {
  SaleDetail,
  SaleListItem,
  SalesInitData,
  SalesListPagination,
  SalesListQuery,
  SalesSummary,
} from "@/types/sales";

type SalesState = {
  // GET /sales/init
  data: SalesInitData | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";

  // GET /sales (list)
  currentRequestId: string | null;
  listError: string | null;
  listLoading: boolean;
  listLoadingMore: boolean;
  listRefreshing: boolean;
  pagination: SalesListPagination;
  query: SalesListQuery;
  sales: SaleListItem[];
  totalCount: number;

  // GET /sales/:id
  detail: SaleDetail | null;
  detailError: string | null;
  detailLoading: boolean;

  // POST /sales, PATCH /sales/:id, POST /sales/:id/checkout
  checkingOut: boolean;
  checkoutError: string | null;
  saveError: string | null;
  saving: boolean;

  // DELETE /sales/:id
  deleteError: string | null;
  deletingSaleIds: string[];

  // GET /sales/summary
  summary: SalesSummary | null;
  summaryError: string | null;
  summaryLoading: boolean;

  // GET /sales/export
  exportError: string | null;
  exporting: boolean;
};

const initialQuery: SalesListQuery = {
  limit: 20,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_order: "desc",
  status: undefined,
};

const initialPagination: SalesListPagination = {
  hasMore: true,
  limit: 20,
  nextOffset: 0,
  offset: 0,
};

const initialState: SalesState = {
  data: null,
  error: null,
  loading: false,
  refreshing: false,
  status: "idle",

  currentRequestId: null,
  listError: null,
  listLoading: false,
  listLoadingMore: false,
  listRefreshing: false,
  pagination: initialPagination,
  query: initialQuery,
  sales: [],
  totalCount: 0,

  detail: null,
  detailError: null,
  detailLoading: false,

  checkingOut: false,
  checkoutError: null,
  saveError: null,
  saving: false,

  deleteError: null,
  deletingSaleIds: [],

  summary: null,
  summaryError: null,
  summaryLoading: false,

  exportError: null,
  exporting: false,
};

const isAppendRequest = (args?: FetchSalesArgs) =>
  !args?.refresh && !args?.reset && typeof args?.offset === "number" && args.offset > 0;

const mergeSales = (existingSales: SaleListItem[], incomingSales: SaleListItem[]) => {
  const seenIds = new Set(existingSales.map((sale) => sale.id));
  const uniqueIncoming = incomingSales.filter((sale) => !seenIds.has(sale.id));

  return [...existingSales, ...uniqueIncoming];
};

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesInitThunk.pending, (state, action) => {
        const isRefresh = Boolean(action.meta.arg?.refresh) && state.data !== null;

        state.error = null;
        state.loading = !isRefresh;
        state.refreshing = isRefresh;
        state.status = state.data ? "succeeded" : "loading";
      })
      .addCase(fetchSalesInitThunk.fulfilled, (state, action) => {
        state.data = action.payload;
        state.error = null;
        state.loading = false;
        state.refreshing = false;
        state.status = "succeeded";
      })
      .addCase(fetchSalesInitThunk.rejected, (state, action) => {
        state.error =
          action.payload?.message ?? action.error.message ?? "Unable to load sale data.";
        state.loading = false;
        state.refreshing = false;
        state.status = state.data ? "succeeded" : "failed";
      })
      .addCase(fetchSalesThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.listError = null;
        state.listLoading = !appendRequest && !action.meta.arg?.refresh;
        state.listLoadingMore = appendRequest;
        state.listRefreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchSalesThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.sales = appendRequest
          ? mergeSales(state.sales, action.payload.sales)
          : action.payload.sales;
        state.currentRequestId = null;
        state.listError = null;
        state.listLoading = false;
        state.listLoadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.listRefreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchSalesThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.listError = action.payload?.message ?? action.error.message ?? "Unable to load sales.";
        state.listLoading = false;
        state.listLoadingMore = false;
        state.listRefreshing = false;
      })
      .addCase(fetchSaleByIdThunk.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchSaleByIdThunk.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detailError = null;
        state.detail = action.payload;
      })
      .addCase(fetchSaleByIdThunk.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError =
          action.payload?.message ?? action.error.message ?? "Unable to load sale details.";
      })
      .addCase(createSaleThunk.pending, (state) => {
        state.saveError = null;
        state.saving = true;
      })
      .addCase(createSaleThunk.fulfilled, (state, action) => {
        state.saveError = null;
        state.saving = false;
        state.detail = action.payload.sale;
      })
      .addCase(createSaleThunk.rejected, (state, action) => {
        state.saveError = action.payload?.message ?? action.error.message ?? "Unable to save sale.";
        state.saving = false;
      })
      .addCase(updateSaleThunk.pending, (state) => {
        state.saveError = null;
        state.saving = true;
      })
      .addCase(updateSaleThunk.fulfilled, (state, action) => {
        state.saveError = null;
        state.saving = false;
        state.detail = action.payload.sale;
      })
      .addCase(updateSaleThunk.rejected, (state, action) => {
        state.saveError = action.payload?.message ?? action.error.message ?? "Unable to save sale.";
        state.saving = false;
      })
      .addCase(checkoutSaleThunk.pending, (state) => {
        state.checkoutError = null;
        state.checkingOut = true;
      })
      .addCase(checkoutSaleThunk.fulfilled, (state, action) => {
        state.checkoutError = null;
        state.checkingOut = false;
        state.detail = action.payload.sale;
      })
      .addCase(checkoutSaleThunk.rejected, (state, action) => {
        state.checkoutError =
          action.payload?.message ?? action.error.message ?? "Unable to complete checkout.";
        state.checkingOut = false;
      })
      .addCase(deleteSaleThunk.pending, (state, action) => {
        state.deleteError = null;
        state.deletingSaleIds = [...state.deletingSaleIds, action.meta.arg];
      })
      .addCase(deleteSaleThunk.fulfilled, (state, action) => {
        state.deleteError = null;
        state.deletingSaleIds = state.deletingSaleIds.filter(
          (saleId) => saleId !== action.payload.saleId,
        );
        state.sales = state.sales.filter((sale) => sale.id !== action.payload.saleId);
        state.totalCount = Math.max(0, state.totalCount - 1);

        if (state.detail?.id === action.payload.saleId) {
          state.detail = null;
        }
      })
      .addCase(deleteSaleThunk.rejected, (state, action) => {
        state.deleteError =
          action.payload?.message ?? action.error.message ?? "Unable to delete sale.";
        state.deletingSaleIds = state.deletingSaleIds.filter(
          (saleId) => saleId !== action.meta.arg,
        );
      })
      .addCase(fetchSalesSummaryThunk.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchSalesSummaryThunk.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = null;
        state.summary = action.payload;
      })
      .addCase(fetchSalesSummaryThunk.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError =
          action.payload?.message ?? action.error.message ?? "Unable to load sales summary.";
      })
      .addCase(exportSalesThunk.pending, (state) => {
        state.exporting = true;
        state.exportError = null;
      })
      .addCase(exportSalesThunk.fulfilled, (state) => {
        state.exporting = false;
        state.exportError = null;
      })
      .addCase(exportSalesThunk.rejected, (state, action) => {
        state.exporting = false;
        state.exportError =
          action.payload?.message ?? action.error.message ?? "Unable to export sales.";
      });
  },
});

export const selectSalesInitData = (state: RootState) => state.sales.data;
export const selectSalesInitError = (state: RootState) => state.sales.error;
export const selectSalesInitLoading = (state: RootState) => state.sales.loading;
export const selectSalesInitRefreshing = (state: RootState) => state.sales.refreshing;
export const selectSalesInitStatus = (state: RootState) => state.sales.status;

export const selectSales = (state: RootState) => state.sales.sales;
export const selectSalesListError = (state: RootState) => state.sales.listError;
export const selectSalesListLoading = (state: RootState) => state.sales.listLoading;
export const selectSalesListLoadingMore = (state: RootState) => state.sales.listLoadingMore;
export const selectSalesListRefreshing = (state: RootState) => state.sales.listRefreshing;
export const selectSalesPagination = (state: RootState) => state.sales.pagination;
export const selectSalesQuery = (state: RootState) => state.sales.query;
export const selectSalesTotalCount = (state: RootState) => state.sales.totalCount;

export const selectSaleDetail = (state: RootState) => state.sales.detail;
export const selectSaleDetailLoading = (state: RootState) => state.sales.detailLoading;
export const selectSaleDetailError = (state: RootState) => state.sales.detailError;

export const selectSaleSaving = (state: RootState) => state.sales.saving;
export const selectSaleSaveError = (state: RootState) => state.sales.saveError;
export const selectSaleCheckingOut = (state: RootState) => state.sales.checkingOut;
export const selectSaleCheckoutError = (state: RootState) => state.sales.checkoutError;

export const selectSaleDeletingIds = (state: RootState) => state.sales.deletingSaleIds;
export const selectSaleDeleteError = (state: RootState) => state.sales.deleteError;

export const selectSalesSummary = (state: RootState) => state.sales.summary;
export const selectSalesSummaryLoading = (state: RootState) => state.sales.summaryLoading;
export const selectSalesSummaryError = (state: RootState) => state.sales.summaryError;

export const selectSalesExporting = (state: RootState) => state.sales.exporting;
export const selectSalesExportError = (state: RootState) => state.sales.exportError;

export default salesSlice.reducer;
