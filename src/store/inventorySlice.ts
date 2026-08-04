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
  fetchStockReconciliationThunk,
  saveStockReconciliationThunk,
  saveReconciliationRowThunk,
  fetchConsumablesThunk,
  fetchConsumableKpisThunk,
  fetchConsumableByIdThunk,
} from "../middleware/inventory/inventory.thunk";
import type {
  Stocktake, Supplier, StockReconciliationRow,
  ConsumableListRow, ConsumableKpis, ConsumableDetail,
} from "../types/inventory.types";

interface InventoryState {
  stocktakes: Stocktake[];
  suppliers: Supplier[];
  currentStocktake: Stocktake | null;
  reconciliationRows: StockReconciliationRow[];
  reconciliationLoading: boolean;
  reconciliationSaving: boolean;
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
  reconciliationRows: [],
  reconciliationLoading: false,
  reconciliationSaving: false,
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

    // Create Supplier
    builder.addCase(createSupplierThunk.fulfilled, (state, action) => {
      state.suppliers.push(action.payload);
    });

    // Update Supplier
    builder.addCase(updateSupplierThunk.fulfilled, (state, action) => {
      const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.suppliers[index] = action.payload;
      }
    });

    // Delete Supplier
    builder.addCase(deleteSupplierThunk.fulfilled, (state, action) => {
      state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
    });

    // Fetch Stock Reconciliation
    builder.addCase(fetchStockReconciliationThunk.pending, (state) => {
      state.reconciliationLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStockReconciliationThunk.fulfilled, (state, action) => {
      state.reconciliationLoading = false;
      state.reconciliationRows = action.payload;
    });
    builder.addCase(fetchStockReconciliationThunk.rejected, (state, action) => {
      state.reconciliationLoading = false;
      state.error = action.payload as string;
    });

    // Save All Reconciliation
    builder.addCase(saveStockReconciliationThunk.pending, (state) => {
      state.reconciliationSaving = true;
    });
    builder.addCase(saveStockReconciliationThunk.fulfilled, (state) => {
      state.reconciliationSaving = false;
    });
    builder.addCase(saveStockReconciliationThunk.rejected, (state, action) => {
      state.reconciliationSaving = false;
      state.error = action.payload as string;
    });

    // Save Single Reconciliation Row
    builder.addCase(saveReconciliationRowThunk.fulfilled, (state, action) => {
      const idx = state.reconciliationRows.findIndex(
        (r) => r.product_id === action.payload.product_id
      );
      if (idx !== -1) {
        state.reconciliationRows[idx] = action.payload;
      }
    });

    // Consumable Inventory: list
    builder.addCase(fetchConsumablesThunk.pending, (state) => {
      state.consumablesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConsumablesThunk.fulfilled, (state, action) => {
      state.consumablesLoading = false;
      state.consumables = action.payload.data;
      state.consumablesPage = action.payload.page;
      state.consumablesPageSize = action.payload.pageSize;
      state.consumablesTotalRecords = action.payload.totalRecords;
      state.consumablesTotalPages = action.payload.totalPages;
    });
    builder.addCase(fetchConsumablesThunk.rejected, (state, action) => {
      state.consumablesLoading = false;
      state.error = action.payload as string;
    });

    // Consumable Inventory: KPIs
    builder.addCase(fetchConsumableKpisThunk.pending, (state) => {
      state.consumableKpisLoading = true;
    });
    builder.addCase(fetchConsumableKpisThunk.fulfilled, (state, action) => {
      state.consumableKpisLoading = false;
      state.consumableKpis = action.payload;
    });
    builder.addCase(fetchConsumableKpisThunk.rejected, (state, action) => {
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
