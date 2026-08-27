import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchStocktakesThunk,
  createStocktakeThunk,
  processStockTakeThunk,
  deleteStocktakeThunk,
  fetchSuppliersThunk,
  createSupplierThunk,
  updateSupplierThunk,
  deleteSupplierThunk,
  fetchConsumablesDashboardThunk,
  fetchConsumableByIdThunk,
} from "../middleware/inventory/inventory.thunk";
import type {
  Stocktake, SupplierWithBalance,
  ConsumableListRow, ConsumableKpis, ConsumableDetail,
} from "../types/inventory.types";

interface InventoryState {
  stocktakes: Stocktake[];
  suppliers: SupplierWithBalance[];
  currentStocktake: Stocktake | null;
  loading: boolean;
  error: string | null;

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
  stocktakes: [],
  suppliers: [],
  currentStocktake: null,
  loading: false,
  error: null,

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
    setCurrentStocktake: (state, action: PayloadAction<Stocktake | null>) => {
      state.currentStocktake = action.payload;
    },
    clearConsumableDetail: (state) => {
      state.consumableDetail = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Stocktakes
    builder.addCase(fetchStocktakesThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchStocktakesThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.stocktakes = action.payload;
    });
    builder.addCase(fetchStocktakesThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create Stocktake
    builder.addCase(createStocktakeThunk.fulfilled, (state, action) => {
      state.stocktakes.unshift(action.payload);
      state.currentStocktake = action.payload;
    });

    // Process Stocktake
    builder.addCase(processStockTakeThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(processStockTakeThunk.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(processStockTakeThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Delete Stocktake
    builder.addCase(deleteStocktakeThunk.fulfilled, (state, action) => {
      state.stocktakes = state.stocktakes.filter(s => s.id !== action.payload);
    });

    // Fetch Suppliers
    builder.addCase(fetchSuppliersThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSuppliersThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.suppliers = action.payload;
    });
    builder.addCase(fetchSuppliersThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
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
  },
});

export const { clearInventoryError, setCurrentStocktake, clearConsumableDetail } = inventorySlice.actions;
export default inventorySlice.reducer;
