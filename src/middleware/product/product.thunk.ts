import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { getApiErrorMessage } from "@/services/api";
import { productService } from "@/services/product.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  Brand,
  CreateBrandRequest,
  CreateBrandResponse,
  CreateProductRequest,
  CreateProductResponse,
  DeleteBrandResponse,
  DeleteProductResponse,
  InventorySummary,
  Product,
  ProductListQuery,
  ProductListResponse,
  UpdateBrandRequest,
  UpdateBrandResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from "@/types/product";

export type FetchProductsArgs = {
  brandId?: string | null;
  category?: string | null;
  isActive?: boolean | null;
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: ProductListQuery["sort_order"];
};

export type FetchBrandsArgs = { refresh?: boolean };
type RejectValue = { message: string };

const hasOwn = (value: object | undefined, key: string): boolean =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const getNextQuery = (
  state: RootState["product"],
  args?: FetchProductsArgs,
): ProductListQuery => ({
  brandId: hasOwn(args, "brandId") ? args?.brandId ?? undefined : state.query.brandId,
  category: hasOwn(args, "category") ? args?.category ?? undefined : state.query.category,
  isActive: hasOwn(args, "isActive") ? args?.isActive ?? undefined : state.query.isActive,
  limit: args?.limit ?? state.query.limit,
  offset: args?.offset ?? (args?.refresh || args?.reset ? 0 : state.query.offset),
  search: args?.search ?? state.query.search,
  sort_by: args?.sort_by ?? state.query.sort_by,
  sort_order: args?.sort_order ?? state.query.sort_order,
});

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

export const fetchProductsThunk = createAsyncThunk<
  ProductListResponse,
  FetchProductsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>("product/fetchProducts", async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const salonId = selectActiveBranchId(state);
    return await productService.fetchProducts(getNextQuery(state.product, args), salonId);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchInventorySummaryThunk = createAsyncThunk<
  InventorySummary,
  void,
  { rejectValue: RejectValue; state: RootState }
>("product/fetchInventorySummary", async (_args, { getState, rejectWithValue }) => {
  try {
    return await productService.fetchInventorySummary(selectActiveBranchId(getState()));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchProductByIdThunk = createAsyncThunk<
  Product,
  string,
  { rejectValue: RejectValue }
>("product/fetchProductById", async (id, { rejectWithValue }) => {
  try {
    return await productService.fetchProductById(id);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const createProductThunk = createAsyncThunk<
  CreateProductResponse,
  Omit<CreateProductRequest, "salon_id">,
  { rejectValue: RejectValue; state: RootState }
>("product/createProduct", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const response = await productService.createProduct({ ...payload, salon_id: salonId ?? undefined });

    void dispatch(fetchProductsThunk({ ...getState().product.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchInventorySummaryThunk());
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const updateProductThunk = createAsyncThunk<
  UpdateProductResponse,
  { data: Omit<UpdateProductRequest, "salon_id">; id: string },
  { rejectValue: RejectValue; state: RootState }
>("product/updateProduct", async ({ data, id }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const response = await productService.updateProduct(id, { ...data, salon_id: salonId ?? undefined });

    void dispatch(fetchProductByIdThunk(id));
    void dispatch(fetchProductsThunk({ ...getState().product.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchInventorySummaryThunk());
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const deleteProductThunk = createAsyncThunk<
  DeleteProductResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("product/deleteProduct", async (id, { dispatch, rejectWithValue }) => {
  try {
    const response = await productService.deleteProduct(id);

    // The fulfilled reducer removes the product and updates product totals
    // immediately. Reloading here races that reducer and can overwrite the
    // corrected count with stale pagination/summary metadata.
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchBrandsThunk = createAsyncThunk<
  Brand[],
  FetchBrandsArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>("product/fetchBrands", async (_, { getState, rejectWithValue }) => {
  try {
    return await productService.fetchBrands(selectActiveBranchId(getState()));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchBrandByIdThunk = createAsyncThunk<
  Brand,
  string,
  { rejectValue: RejectValue }
>("product/fetchBrandById", async (id, { rejectWithValue }) => {
  try {
    return await productService.fetchBrandById(id);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const createBrandThunk = createAsyncThunk<
  CreateBrandResponse,
  Omit<CreateBrandRequest, "salon_id">,
  { rejectValue: RejectValue; state: RootState }
>("product/createBrand", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const response = await productService.createBrand({ ...payload, salon_id: salonId ?? undefined });

    void dispatch(fetchBrandsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const updateBrandThunk = createAsyncThunk<
  UpdateBrandResponse,
  { data: Omit<UpdateBrandRequest, "salon_id">; id: string },
  { rejectValue: RejectValue; state: RootState }
>("product/updateBrand", async ({ data, id }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const response = await productService.updateBrand(id, { ...data, salon_id: salonId ?? undefined });

    void dispatch(fetchBrandByIdThunk(id));
    void dispatch(fetchBrandsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const deleteBrandThunk = createAsyncThunk<
  DeleteBrandResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("product/deleteBrand", async (id, { dispatch, rejectWithValue }) => {
  try {
    const response = await productService.deleteBrand(id);

    void dispatch(fetchBrandsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
