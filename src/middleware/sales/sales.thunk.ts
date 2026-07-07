import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { salesService } from "@/services/sales.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  CheckoutSaleRequest,
  CheckoutSaleResponse,
  CreateSaleRequest,
  CreateSaleResponse,
  DeleteSaleResponse,
  ExportSalesResponse,
  SaleDetail,
  SalesInitData,
  SalesListQuery,
  SalesListResponse,
  SalesSummary,
  UpdateSaleRequest,
  UpdateSaleResponse,
} from "@/types/sales";

export type FetchSalesInitArgs = {
  refresh?: boolean;
};

type FetchSalesInitRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const fetchSalesInitThunk = createAsyncThunk<
  SalesInitData,
  FetchSalesInitArgs | undefined,
  { rejectValue: FetchSalesInitRejectValue; state: RootState }
>("sales/fetchSalesInit", async (_args, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    return await salesService.getSalesInit(salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Sales] Init fetch failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

type SalesRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): SalesRejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

export type FetchSalesArgs = {
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: SalesListQuery["sort_order"];
  status?: string;
};

export const fetchSalesThunk = createAsyncThunk<
  SalesListResponse,
  FetchSalesArgs | undefined,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/fetchSales", async (args, { getState, rejectWithValue }) => {
  const salesState = getState().sales;

  const nextQuery: SalesListQuery = {
    limit: args?.limit ?? salesState.query.limit,
    offset: args?.offset ?? salesState.query.offset,
    search: args?.search ?? salesState.query.search,
    sort_by: args?.sort_by ?? salesState.query.sort_by,
    sort_order: args?.sort_order ?? salesState.query.sort_order,
    ...(args?.status !== undefined ? { status: args.status } : { status: salesState.query.status }),
  };

  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    return await salesService.getSales(nextQuery, salonId);
  } catch (error) {
    console.error("[Sales] List fetch failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSaleByIdThunk = createAsyncThunk<
  SaleDetail,
  string,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/fetchSaleById", async (saleId, { rejectWithValue }) => {
  try {
    return await salesService.getSale(saleId);
  } catch (error) {
    console.error("[Sales] Fetch by ID failed", { ...toRejectValue(error), saleId });

    return rejectWithValue(toRejectValue(error));
  }
});

export const createSaleThunk = createAsyncThunk<
  CreateSaleResponse,
  CreateSaleRequest,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/createSale", async (payload, { rejectWithValue }) => {
  try {
    return await salesService.createSale(payload);
  } catch (error) {
    console.error("[Sales] Create failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateSaleThunk = createAsyncThunk<
  UpdateSaleResponse,
  { saleId: string; updates: UpdateSaleRequest },
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/updateSale", async ({ saleId, updates }, { rejectWithValue }) => {
  try {
    return await salesService.updateSale(saleId, updates);
  } catch (error) {
    console.error("[Sales] Update failed", { ...toRejectValue(error), saleId });

    return rejectWithValue(toRejectValue(error));
  }
});

export const checkoutSaleThunk = createAsyncThunk<
  CheckoutSaleResponse,
  { payload: CheckoutSaleRequest; saleId: string },
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/checkoutSale", async ({ payload, saleId }, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await salesService.checkoutSale(saleId, payload);
    const currentQuery = getState().sales.query;

    // A checkout is a definitive completion event — keep the Sales History list
    // and summary in sync even if that screen isn't currently mounted.
    void dispatch(
      fetchSalesThunk({
        limit: currentQuery.limit,
        offset: 0,
        reset: true,
        search: currentQuery.search,
        status: currentQuery.status,
      }),
    );
    void dispatch(fetchSalesSummaryThunk());

    return response;
  } catch (error) {
    console.error("[Sales] Checkout failed", { ...toRejectValue(error), saleId });

    return rejectWithValue(toRejectValue(error));
  }
});

export const deleteSaleThunk = createAsyncThunk<
  DeleteSaleResponse,
  string,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/deleteSale", async (saleId, { dispatch, rejectWithValue }) => {
  try {
    const response = await salesService.deleteSale(saleId);

    void dispatch(fetchSalesSummaryThunk());

    return response;
  } catch (error) {
    console.error("[Sales] Delete failed", { ...toRejectValue(error), saleId });

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSalesSummaryThunk = createAsyncThunk<
  SalesSummary,
  void,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/fetchSalesSummary", async (_args, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    return await salesService.getSalesSummary(salonId);
  } catch (error) {
    console.error("[Sales] Summary fetch failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});

export const exportSalesThunk = createAsyncThunk<
  ExportSalesResponse,
  Partial<SalesListQuery> | undefined,
  { rejectValue: SalesRejectValue; state: RootState }
>("sales/exportSales", async (query, { rejectWithValue }) => {
  try {
    return await salesService.exportSales(query);
  } catch (error) {
    console.error("[Sales] Export failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});
