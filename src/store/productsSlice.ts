import { createSlice } from "@reduxjs/toolkit";
import {
  fetchProductsThunk,
  createProductThunk,
  updateProductThunk,
  deleteProductThunk,
  fetchBrandsThunk,
  createBrandThunk,
  deleteBrandThunk,
  fetchCategoriesThunk,
  createCategoryThunk,
  deleteCategoryThunk,
} from "../middleware/catalog/products.thunk";

interface ProductsState {
  items: any[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  brands: any[];
  categories: any[];
  loading: {
    fetchAll: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    brands: boolean;
    categories: boolean;
  };
  error: string | null;
  _activeFetchId: string | null;
}

const initialState: ProductsState = {
  items: [],
  page: 1,
  pageSize: 20,
  totalRecords: 0,
  totalPages: 1,
  brands: [],
  categories: [],
  loading: { fetchAll: false, create: false, update: false, delete: false, brands: false, categories: false },
  error: null,
  _activeFetchId: null,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearProductsError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsThunk.pending, (state, action) => {
        state.loading.fetchAll = true;
        state.error = null;
        state._activeFetchId = action.meta.requestId;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state._activeFetchId) return;
        state.loading.fetchAll = false;
        state._activeFetchId = null;
        state.items = action.payload.data;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalRecords = action.payload.totalRecords;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state._activeFetchId) return;
        state.loading.fetchAll = false;
        state._activeFetchId = null;
        state.error = action.payload ?? "Error fetching products";
      });

    builder
      .addCase(createProductThunk.pending, (state) => {
        state.loading.create = true;
      })
      .addCase(createProductThunk.fulfilled, (state) => {
        state.loading.create = false;
      })
      .addCase(createProductThunk.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload ?? "Error creating product";
      });

    builder
      .addCase(updateProductThunk.pending, (state) => {
        state.loading.update = true; state.error = null;
      })
      .addCase(updateProductThunk.fulfilled, (state, action) => {
        state.loading.update = false;
        const idx = state.items.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateProductThunk.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload ?? "Error updating product";
      });

    builder
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
        state.totalRecords = Math.max(0, state.totalRecords - 1);
      });

    builder
      .addCase(fetchBrandsThunk.pending, (state) => {
        state.loading.brands = true;
      })
      .addCase(fetchBrandsThunk.fulfilled, (state, action) => {
        state.loading.brands = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrandsThunk.rejected, (state, action) => {
        state.loading.brands = false;
        state.error = action.payload ?? "Error fetching brands";
      });

    builder
      .addCase(createBrandThunk.fulfilled, (state, action) => {
        state.brands.push(action.payload);
      })
      .addCase(deleteBrandThunk.fulfilled, (state, action) => {
        state.brands = state.brands.filter((b) => b.id !== action.payload);
      });

    builder
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.loading.categories = true;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.loading.categories = false;
        state.error = action.payload ?? "Error fetching categories";
      });

    builder
      .addCase(createCategoryThunk.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(deleteCategoryThunk.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload);
      });
  },
});

export const { clearProductsError } = productsSlice.actions;
export default productsSlice.reducer;
