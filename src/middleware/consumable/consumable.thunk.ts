import { createAsyncThunk } from "@reduxjs/toolkit";

import { getApiErrorMessage } from "@/services/api";
import { consumableService } from "@/services/consumable.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  ConsumableAdjustRequest,
  ConsumableAdjustResponse,
  ConsumableAssignedService,
  ConsumableDashboardResponse,
  ConsumableDetail,
  ConsumableListQuery,
  ConsumableUnitConversionsRequest,
  ConsumableUnitConversionsResponse,
  ConsumableUsageHistoryQuery,
  ConsumableUsageHistoryResponse,
} from "@/types/consumable";

export type FetchConsumablesArgs = {
  brandId?: string[];
  categoryId?: string[];
  limit?: number;
  page?: number;
  productType?: string[];
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  serviceId?: string[];
  sortBy?: ConsumableListQuery["sortBy"];
  sortOrder?: ConsumableListQuery["sortOrder"];
  status?: ConsumableListQuery["status"];
  supplierId?: string[];
  unit?: string[];
};

type RejectValue = { message: string };

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

const hasOwn = (value: object | undefined, key: string): boolean =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const getNextQuery = (
  state: RootState["consumable"],
  args?: FetchConsumablesArgs,
): ConsumableListQuery => ({
  brandId: hasOwn(args, "brandId") ? args?.brandId : state.query.brandId,
  categoryId: hasOwn(args, "categoryId") ? args?.categoryId : state.query.categoryId,
  limit: args?.limit ?? state.query.limit,
  page: args?.page ?? (args?.refresh || args?.reset ? 1 : state.query.page),
  productType: hasOwn(args, "productType") ? args?.productType : state.query.productType,
  search: args?.search ?? state.query.search,
  serviceId: hasOwn(args, "serviceId") ? args?.serviceId : state.query.serviceId,
  sortBy: args?.sortBy ?? state.query.sortBy,
  sortOrder: args?.sortOrder ?? state.query.sortOrder,
  status: hasOwn(args, "status") ? args?.status : state.query.status,
  supplierId: hasOwn(args, "supplierId") ? args?.supplierId : state.query.supplierId,
  unit: hasOwn(args, "unit") ? args?.unit : state.query.unit,
});

export const fetchConsumablesThunk = createAsyncThunk<
  ConsumableDashboardResponse,
  FetchConsumablesArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>("consumable/fetchConsumables", async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const salonId = selectActiveBranchId(state);
    return await consumableService.getDashboard(getNextQuery(state.consumable, args), salonId);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchConsumableByIdThunk = createAsyncThunk<
  ConsumableDetail,
  string,
  { rejectValue: RejectValue }
>("consumable/fetchConsumableById", async (id, { rejectWithValue }) => {
  try {
    return await consumableService.getById(id);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const adjustConsumableStockThunk = createAsyncThunk<
  ConsumableAdjustResponse,
  { id: string; payload: ConsumableAdjustRequest },
  { rejectValue: RejectValue; state: RootState }
>("consumable/adjustStock", async ({ id, payload }, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await consumableService.adjustStock(id, payload);

    void dispatch(fetchConsumableByIdThunk(id));
    void dispatch(fetchConsumablesThunk({ ...getState().consumable.query, page: 1, refresh: true, reset: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchAssignedServicesThunk = createAsyncThunk<
  { assignedServices: ConsumableAssignedService[]; id: string },
  string,
  { rejectValue: RejectValue }
>("consumable/fetchAssignedServices", async (id, { rejectWithValue }) => {
  try {
    const assignedServices = await consumableService.getAssignedServices(id);
    return { assignedServices, id };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchUnitConversionsThunk = createAsyncThunk<
  ConsumableUnitConversionsResponse & { id: string },
  string,
  { rejectValue: RejectValue }
>("consumable/fetchUnitConversions", async (id, { rejectWithValue }) => {
  try {
    const response = await consumableService.getUnitConversions(id);
    return { ...response, id };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const saveUnitConversionsThunk = createAsyncThunk<
  ConsumableUnitConversionsResponse & { id: string },
  { id: string; payload: ConsumableUnitConversionsRequest },
  { rejectValue: RejectValue }
>("consumable/saveUnitConversions", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const response = await consumableService.replaceUnitConversions(id, payload);
    return { ...response, id };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export type FetchUsageHistoryArgs = {
  direction?: ConsumableUsageHistoryQuery["direction"];
  from?: string;
  limit?: number;
  page?: number;
  productId?: string;
  refresh?: boolean;
  reset?: boolean;
  to?: string;
};

const getNextUsageHistoryQuery = (
  state: RootState["consumable"],
  args?: FetchUsageHistoryArgs,
): ConsumableUsageHistoryQuery => ({
  direction: hasOwn(args, "direction") ? args?.direction : state.usageHistoryQuery.direction,
  from: hasOwn(args, "from") ? args?.from : state.usageHistoryQuery.from,
  limit: args?.limit ?? state.usageHistoryQuery.limit,
  page: args?.page ?? (args?.refresh || args?.reset ? 1 : state.usageHistoryQuery.page),
  productId: hasOwn(args, "productId") ? args?.productId : state.usageHistoryQuery.productId,
  to: hasOwn(args, "to") ? args?.to : state.usageHistoryQuery.to,
});

export const fetchUsageHistoryThunk = createAsyncThunk<
  ConsumableUsageHistoryResponse,
  FetchUsageHistoryArgs | undefined,
  { rejectValue: RejectValue; state: RootState }
>("consumable/fetchUsageHistory", async (args, { getState, rejectWithValue }) => {
  try {
    return await consumableService.getUsageHistory(getNextUsageHistoryQuery(getState().consumable, args));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
