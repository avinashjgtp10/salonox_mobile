import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Multi-select per field, matching the shared JiraFilterMenu's contract
// (Record<string, string[]>) — an empty array means "no restriction".
//
// `categoryId` was dropped: the Service menu filters by category through its
// chips row now, and having a second category control inside the filter panel
// meant two inputs could disagree about which category was being shown.
export interface ServiceFiltersState {
  durationRange: string[];     // "0-30" | "30-60" | "60-120" | "120+"
  onlineBooking: string[];     // "Enabled" | "Disabled"
}

// Baseline state — used for both initial load and "reset to default".
export const INITIAL_SERVICE_FILTERS: ServiceFiltersState = {
  durationRange: [],
  onlineBooking: [],
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
