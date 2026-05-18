import { createSlice } from "@reduxjs/toolkit";
import type { MarketplaceProfileFull } from "../types/marketplace.types";
import {
  fetchMarketplaceProfileThunk,
  publishMarketplaceThunk,
  unpublishMarketplaceThunk,
} from "../middleware/marketplace/marketplace.thunk";

export interface MarketplaceState {
  profile: MarketplaceProfileFull | null;
  loading: boolean;
  error: string | null;
}

const initialState: MarketplaceState = {
  profile: null,
  loading: false,
  error: null,
};

const marketplaceSlice = createSlice({
  name: "marketplace",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchMarketplaceProfileThunk
    builder.addCase(fetchMarketplaceProfileThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMarketplaceProfileThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.profile = action.payload;
    });
    builder.addCase(fetchMarketplaceProfileThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? "Failed to fetch marketplace profile";
    });

    // publishMarketplaceThunk
    builder.addCase(publishMarketplaceThunk.fulfilled, (state) => {
      if (state.profile) {
        state.profile.is_published = true;
      }
    });

    // unpublishMarketplaceThunk
    builder.addCase(unpublishMarketplaceThunk.fulfilled, (state) => {
      if (state.profile) {
        state.profile.is_published = false;
      }
    });
  },
});

export const { clearError } = marketplaceSlice.actions;
export default marketplaceSlice.reducer;
