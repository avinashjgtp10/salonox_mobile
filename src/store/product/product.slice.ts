import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  createBrandThunk,
  createProductThunk,
  deleteBrandThunk,
  deleteProductThunk,
  fetchBrandByIdThunk,
  fetchBrandsThunk,
  fetchInventorySummaryThunk,
  fetchProductByIdThunk,
  fetchProductsThunk,
  updateBrandThunk,
  updateProductThunk,
} from "@/middleware/product/product.thunk";
import type { RootState } from "@/store";
import type { Brand, InventorySummary, Product, ProductListQuery } from "@/types/product";

type ProductState = {
  brandDetailsError: string | null;
  brandDetailsLoading: boolean;
  brandError: string | null;
  brandMutationError: string | null;
  brandMutationLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
  brandsRefreshing: boolean;
  currentBrand: Brand | null;
  currentProduct: Product | null;
  deletingBrandIds: string[];
  deletingProductIds: string[];
  detailsError: string | null;
  detailsLoading: boolean;
  error: string | null;
  inventorySummary: InventorySummary;
  inventorySummaryError: string | null;
  inventorySummaryLoading: boolean;
  loading: boolean;
  loadingMore: boolean;
  mutationError: string | null;
  mutationLoading: boolean;
  pagination: { hasMore: boolean; limit: number; nextOffset: number; offset: number };
  products: Product[];
  query: ProductListQuery;
  refreshing: boolean;
  totalCount: number;
};

const initialQuery: ProductListQuery = {
  limit: 20,
  offset: 0,
  search: "",
  sort_by: "name",
  sort_order: "asc",
};

const initialState: ProductState = {
  brandDetailsError: null,
  brandDetailsLoading: false,
  brandError: null,
  brandMutationError: null,
  brandMutationLoading: false,
  brands: [],
  brandsLoading: false,
  brandsRefreshing: false,
  currentBrand: null,
  currentProduct: null,
  deletingBrandIds: [],
  deletingProductIds: [],
  detailsError: null,
  detailsLoading: false,
  error: null,
  inventorySummary: {
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalProducts: 0,
  },
  inventorySummaryError: null,
  inventorySummaryLoading: false,
  loading: false,
  loadingMore: false,
  mutationError: null,
  mutationLoading: false,
  pagination: { hasMore: false, limit: 20, nextOffset: 0, offset: 0 },
  products: [],
  query: initialQuery,
  refreshing: false,
  totalCount: 0,
};

const upsert = <T extends { id: string }>(items: T[], item: T): T[] => {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    clearBrandMutationError(state) {
      state.brandMutationError = null;
    },
    clearCurrentBrand(state) {
      state.currentBrand = null;
      state.brandDetailsError = null;
    },
    clearCurrentProduct(state) {
      state.currentProduct = null;
      state.detailsError = null;
    },
    clearProductMutationError(state) {
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsThunk.pending, (state, action) => {
        state.error = null;
        const isRefresh = Boolean(action.meta.arg?.refresh);
        const isMore = !isRefresh && (action.meta.arg?.offset ?? 0) > 0;
        state.refreshing = isRefresh;
        state.loadingMore = isMore;
        state.loading = !isRefresh && !isMore;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.query = action.payload.query;
        state.pagination = action.payload.pagination;
        state.totalCount = action.payload.totalCount;
        if (action.payload.query.offset === 0) {
          state.products = action.payload.products;
        } else {
          const incomingIds = new Set(action.payload.products.map((product) => product.id));
          state.products = [
            ...state.products.filter((product) => !incomingIds.has(product.id)),
            ...action.payload.products,
          ];
        }
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.error = action.payload?.message ?? "Unable to load products.";
      })
      .addCase(fetchInventorySummaryThunk.pending, (state) => {
        state.inventorySummaryLoading = true;
        state.inventorySummaryError = null;
      })
      .addCase(fetchInventorySummaryThunk.fulfilled, (state, action) => {
        state.inventorySummaryLoading = false;
        state.inventorySummary = action.payload;
      })
      .addCase(fetchInventorySummaryThunk.rejected, (state, action) => {
        state.inventorySummaryLoading = false;
        state.inventorySummaryError = action.payload?.message ?? "Unable to load inventory summary.";
      })
      .addCase(fetchProductByIdThunk.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchProductByIdThunk.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentProduct = action.payload;
        state.products = upsert(state.products, action.payload);
      })
      .addCase(fetchProductByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload?.message ?? "Unable to load product.";
      })
      .addCase(createProductThunk.pending, (state) => {
        state.mutationLoading = true;
        state.mutationError = null;
      })
      .addCase(createProductThunk.fulfilled, (state, action) => {
        state.mutationLoading = false;
        state.products = upsert(state.products, action.payload.product);
        state.totalCount += 1;
      })
      .addCase(createProductThunk.rejected, (state, action) => {
        state.mutationLoading = false;
        state.mutationError = action.payload?.message ?? "Unable to create product.";
      })
      .addCase(updateProductThunk.pending, (state) => {
        state.mutationLoading = true;
        state.mutationError = null;
      })
      .addCase(updateProductThunk.fulfilled, (state, action) => {
        state.mutationLoading = false;
        state.products = upsert(state.products, action.payload.product);
        state.currentProduct = action.payload.product;
      })
      .addCase(updateProductThunk.rejected, (state, action) => {
        state.mutationLoading = false;
        state.mutationError = action.payload?.message ?? "Unable to update product.";
      })
      .addCase(deleteProductThunk.pending, (state, action) => {
        state.deletingProductIds.push(action.meta.arg);
        state.mutationError = null;
      })
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.deletingProductIds = state.deletingProductIds.filter(
          (id) => id !== action.payload.productId,
        );
        state.products = state.products.filter((item) => item.id !== action.payload.productId);
        if (state.currentProduct?.id === action.payload.productId) state.currentProduct = null;
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      .addCase(deleteProductThunk.rejected, (state, action) => {
        state.deletingProductIds = state.deletingProductIds.filter((id) => id !== action.meta.arg);
        state.mutationError = action.payload?.message ?? "Unable to delete product.";
      })
      .addCase(fetchBrandsThunk.pending, (state, action) => {
        state.brandError = null;
        state.brandsRefreshing = Boolean(action.meta.arg?.refresh);
        state.brandsLoading = !action.meta.arg?.refresh;
      })
      .addCase(fetchBrandsThunk.fulfilled, (state, action) => {
        state.brandsLoading = false;
        state.brandsRefreshing = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrandsThunk.rejected, (state, action) => {
        state.brandsLoading = false;
        state.brandsRefreshing = false;
        state.brandError = action.payload?.message ?? "Unable to load brands.";
      })
      .addCase(fetchBrandByIdThunk.pending, (state) => {
        state.brandDetailsLoading = true;
        state.brandDetailsError = null;
      })
      .addCase(fetchBrandByIdThunk.fulfilled, (state, action) => {
        state.brandDetailsLoading = false;
        state.currentBrand = action.payload;
        state.brands = upsert(state.brands, action.payload);
      })
      .addCase(fetchBrandByIdThunk.rejected, (state, action) => {
        state.brandDetailsLoading = false;
        state.brandDetailsError = action.payload?.message ?? "Unable to load brand.";
      })
      .addCase(createBrandThunk.pending, (state) => {
        state.brandMutationLoading = true;
        state.brandMutationError = null;
      })
      .addCase(createBrandThunk.fulfilled, (state, action) => {
        state.brandMutationLoading = false;
        state.brands = upsert(state.brands, action.payload.brand);
      })
      .addCase(createBrandThunk.rejected, (state, action) => {
        state.brandMutationLoading = false;
        state.brandMutationError = action.payload?.message ?? "Unable to create brand.";
      })
      .addCase(updateBrandThunk.pending, (state) => {
        state.brandMutationLoading = true;
        state.brandMutationError = null;
      })
      .addCase(updateBrandThunk.fulfilled, (state, action) => {
        state.brandMutationLoading = false;
        state.brands = upsert(state.brands, action.payload.brand);
        state.currentBrand = action.payload.brand;
      })
      .addCase(updateBrandThunk.rejected, (state, action) => {
        state.brandMutationLoading = false;
        state.brandMutationError = action.payload?.message ?? "Unable to update brand.";
      })
      .addCase(deleteBrandThunk.pending, (state, action) => {
        state.deletingBrandIds.push(action.meta.arg);
        state.brandMutationError = null;
      })
      .addCase(deleteBrandThunk.fulfilled, (state, action) => {
        state.deletingBrandIds = state.deletingBrandIds.filter(
          (id) => id !== action.payload.brandId,
        );
        state.brands = state.brands.filter((brand) => brand.id !== action.payload.brandId);
        if (state.currentBrand?.id === action.payload.brandId) state.currentBrand = null;
      })
      .addCase(deleteBrandThunk.rejected, (state, action) => {
        state.deletingBrandIds = state.deletingBrandIds.filter((id) => id !== action.meta.arg);
        state.brandMutationError = action.payload?.message ?? "Unable to delete brand.";
      });
  },
});

export const {
  clearBrandMutationError,
  clearCurrentBrand,
  clearCurrentProduct,
  clearProductMutationError,
} = productSlice.actions;

export const selectProductState = (state: RootState) => state.product;
export const selectProducts = (state: RootState) => state.product.products;
export const selectInventorySummary = (state: RootState) => state.product.inventorySummary;
export const selectInventorySummaryLoading = (state: RootState) => state.product.inventorySummaryLoading;
export const selectBrands = (state: RootState) => state.product.brands;
export const selectProductById = (id: string) =>
  createSelector(selectProducts, (products) => products.find((product) => product.id === id) ?? null);
export const selectBrandById = (id: string) =>
  createSelector(selectBrands, (brands) => brands.find((brand) => brand.id === id) ?? null);

export default productSlice.reducer;
