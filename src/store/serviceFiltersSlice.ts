import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ServiceFiltersState {
  categoryId: string;          // "all" | category ID string
  durationRange: string;       // "all" | "0-30" | "30-60" | "60-120" | "120+"
  onlineBooking: string;       // "All status" | "Enabled" | "Disabled"
}

// Baseline state — used for both initial load and "reset to default".
export const INITIAL_SERVICE_FILTERS: ServiceFiltersState = {
  categoryId: "all",
  durationRange: "all",
  onlineBooking: "All status",
};

const serviceFiltersSlice = createSlice({
  name: "serviceFilters",
  initialState: INITIAL_SERVICE_FILTERS,
  reducers: {
    setServiceFilters(
      state,
      action: PayloadAction<Partial<ServiceFiltersState>>,
    ) {
      return { ...state, ...action.payload };
    },
    resetServiceFilters() {
      return INITIAL_SERVICE_FILTERS;
    },
  },
});

export const { setServiceFilters, resetServiceFilters } =
  serviceFiltersSlice.actions;

export default serviceFiltersSlice.reducer;
