import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ServiceFiltersState {
  onlineBooking: string;       // "All status" | "Enabled" | "Disabled"
  commissions: string;         // "All status" | "Enabled" | "Disabled"
  resourceRequirements: string; // "All status" | "Required" | "Not required"
}

// Baseline state — used for both initial load and "reset to default".
export const INITIAL_SERVICE_FILTERS: ServiceFiltersState = {
  onlineBooking: "All status",
  commissions: "All status",
  resourceRequirements: "All status",
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
