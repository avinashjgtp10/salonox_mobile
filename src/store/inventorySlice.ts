import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSuppliersThunk,
  fetchSupplierFilterOptionsThunk,
  createSupplierThunk,
  updateSupplierThunk,
  deleteSupplierThunk,
  createSupplierPaymentThunk,
  createOrderThunk,
  updateOrderThunk,
  receiveOrderThunk,
  correctReceivedQtyThunk,
  cancelOrderThunk,
  deleteOrderThunk,
  fetchConsumablesDashboardThunk,
  fetchConsumableByIdThunk,
  fetchOrdersThunk,
} from "../middleware/inventory/inventory.thunk";
import type {
  SupplierWithBalance,
  ConsumableListRow, ConsumableKpis, ConsumableDetail,
  Order,
} from "../types/inventory.types";

interface InventoryState {
  suppliers: SupplierWithBalance[];
  suppliersPage: number;
  suppliersPageSize: number;
  suppliersTotal: number;
  supplierCities: string[];
  supplierStates: string[];
  // Tracks whether the filter-options fetch has ever completed, separate
  // from the arrays' own length — a salon with no supplier city/state data
  // gets back {cities: [], states: []} every time, which is indistinguishable
  // from "never loaded" if you only check array length. That's what let
  // SuppliersListPage's mount-effect guard keep refetching on every Close.
  supplierFilterOptionsLoaded: boolean;
  // Set whenever an order/payout action lands that can change a supplier's
  // due_amount/status (order create/update/receive/correct/cancel/delete,
  // payout) — those actions almost never happen through AddSupplierPage's
  // own save flow, so SuppliersListPage's mount-effect "reuse cached list"
  // check can't rely on the `location.state.refresh` flag alone. Cleared
  // once fetchSuppliersThunk actually refetches.
  suppliersStale: boolean;
  loading: boolean;
  error: string | null;

  // Orders (Purchase Orders) — kept in Redux, not page-local state, so
  // OrdersListPage's "skip refetch on a plain Close" check survives the
  // component unmounting/remounting on every route navigation (local
  // useState resets to empty on remount, which silently defeated that
  // check — see OrdersListPage.tsx's mount effect).
  orders: Order[];
  ordersTotal: number;
  ordersLoading: boolean;

  // Consumable Inventory
  consumables: ConsumableListRow[];
  consumablesPage: number;
  consumablesPageSize: number;
  consumablesTotalRecords: number;
  consumablesTotalPages: number;
  consumablesLoading: boolean;
  consumableKpis: ConsumableKpis | null;
  consumableKpisLoading: boolean;
  consumableDetail: ConsumableDetail | null;
  consumableDetailLoading: boolean;
}

const initialState: InventoryState = {
  suppliers: [],
  suppliersPage: 1,
  suppliersPageSize: 10,
  suppliersTotal: 0,
  supplierCities: [],
  supplierStates: [],
  supplierFilterOptionsLoaded: false,
  suppliersStale: false,
  loading: false,
  error: null,

  orders: [],
  ordersTotal: 0,
  ordersLoading: false,

  consumables: [],
  consumablesPage: 1,
  consumablesPageSize: 20,
  consumablesTotalRecords: 0,
  consumablesTotalPages: 0,
  consumablesLoading: false,
  consumableKpis: null,
  consumableKpisLoading: false,
  consumableDetail: null,
  consumableDetailLoading: false,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    clearInventoryError: (state) => {
      state.error = null;
    },
    clearConsumableDetail: (state) => {
      state.consumableDetail = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Suppliers
    builder.addCase(fetchSuppliersThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSuppliersThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.suppliers = action.payload.data;
      state.suppliersTotal = action.payload.total;
      state.suppliersPage = action.payload.page;
      state.suppliersPageSize = action.payload.page_limit;
      state.suppliersStale = false;
    });
    builder.addCase(fetchSuppliersThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(fetchSupplierFilterOptionsThunk.fulfilled, (state, action) => {
      state.supplierCities = action.payload.cities;
      state.supplierStates = action.payload.states;
      state.supplierFilterOptionsLoaded = true;
    });

    // Fetch Orders
    builder.addCase(fetchOrdersThunk.pending, (state) => {
      state.ordersLoading = true;
    });
    builder.addCase(fetchOrdersThunk.fulfilled, (state, action) => {
      state.ordersLoading = false;
      state.orders = action.payload.data;
      state.ordersTotal = action.payload.total;
    });
    builder.addCase(fetchOrdersThunk.rejected, (state) => {
      state.ordersLoading = false;
    });

    // Create Supplier — the create/update endpoints only echo back contact
    // fields, so a freshly created supplier has no balance data yet
    // (defaulted here) until the next fetchSuppliersThunk refresh.
    builder.addCase(createSupplierThunk.fulfilled, (state, action) => {
      state.suppliers.push({
        ...action.payload,
        total_purchase_amount: 0,
        pending_order_count: 0,
        due_amount: 0,
        due_date: null,
        status: "paid",
        open_order_count: 0,
      });
    });

    // Update Supplier — preserve existing balance fields, only overwrite
    // the contact/address fields the update response actually carries.
    builder.addCase(updateSupplierThunk.fulfilled, (state, action) => {
      const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.suppliers[index] = { ...state.suppliers[index], ...action.payload };
      }
    });

    // Delete Supplier
    builder.addCase(deleteSupplierThunk.fulfilled, (state, action) => {
      state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
    });

    // Consumable Inventory: combined list + KPIs, the single request behind
    // the whole page — table rows, pagination, and KPI cards all land here.
    builder.addCase(fetchConsumablesDashboardThunk.pending, (state) => {
      state.consumablesLoading = true;
      state.consumableKpisLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConsumablesDashboardThunk.fulfilled, (state, action) => {
      state.consumablesLoading = false;
      state.consumableKpisLoading = false;
      state.consumables = action.payload.list.data;
      state.consumablesPage = action.payload.list.page;
      state.consumablesPageSize = action.payload.list.pageSize;
      state.consumablesTotalRecords = action.payload.list.totalRecords;
      state.consumablesTotalPages = action.payload.list.totalPages;
      state.consumableKpis = action.payload.kpis;
    });
    builder.addCase(fetchConsumablesDashboardThunk.rejected, (state, action) => {
      state.consumablesLoading = false;
      state.consumableKpisLoading = false;
      state.error = action.payload as string;
    });

    // Consumable Inventory: detail (side panel)
    builder.addCase(fetchConsumableByIdThunk.pending, (state) => {
      state.consumableDetailLoading = true;
    });
    builder.addCase(fetchConsumableByIdThunk.fulfilled, (state, action) => {
      state.consumableDetailLoading = false;
      state.consumableDetail = action.payload;
    });
    builder.addCase(fetchConsumableByIdThunk.rejected, (state, action) => {
      state.consumableDetailLoading = false;
      state.error = action.payload as string;
    });

    // Anything that can move a supplier's due_amount/status behind the list's
    // back — a payout, or any order create/update/receive/correct/cancel/
    // delete — marks the cached suppliers list stale so the next mount of
    // SuppliersListPage refetches instead of showing outdated balances.
    // Must come after every addCase above — RTK requires all addCase calls
    // before any addMatcher in the same builder chain.
    builder.addMatcher(
      (action): action is { type: string } =>
        [
          createSupplierPaymentThunk.fulfilled.type,
          createOrderThunk.fulfilled.type,
          updateOrderThunk.fulfilled.type,
          receiveOrderThunk.fulfilled.type,
          correctReceivedQtyThunk.fulfilled.type,
          cancelOrderThunk.fulfilled.type,
          deleteOrderThunk.fulfilled.type,
        ].includes(action.type),
      (state) => {
        state.suppliersStale = true;
      },
    );
  },
});

export const { clearInventoryError, clearConsumableDetail } = inventorySlice.actions;
export default inventorySlice.reducer;
