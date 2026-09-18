import { createSelector, createSlice } from "@reduxjs/toolkit";

import { fetchSpotlightFeaturesThunk } from "@/middleware/spotlight/spotlight.thunk";
import type { RootState } from "@/store";
import type { SpotlightFeature } from "@/types/spotlight";

type SpotlightState = {
  error: string | null;
  features: SpotlightFeature[];
  // True once a fetch has resolved at least once, so the card can stay hidden
  // (rather than flashing an empty state) until we actually know.
  fetched: boolean;
  loading: boolean;
  readIds: string[];
};

const initialState: SpotlightState = {
  error: null,
  features: [],
  fetched: false,
  loading: false,
  readIds: [],
};

const spotlightSlice = createSlice({
  name: "spotlight",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpotlightFeaturesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpotlightFeaturesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.fetched = true;
        state.features = action.payload.features;
        state.readIds = action.payload.readIds;
      })
      .addCase(fetchSpotlightFeaturesThunk.rejected, (state, action) => {
        state.loading = false;
        // Still mark as fetched: a failed spotlight lookup must never block or
        // visibly break the dashboard — the card simply stays hidden.
        state.fetched = true;
        state.error = action.payload?.message ?? "Unable to load what's new.";
      });
  },
});

export const selectSpotlightFetched = (state: RootState) => state.spotlight.fetched;

// Published features this user hasn't explored yet — the same per-user
// semantics the web dashboard's highlight card uses.
export const selectNewSpotlightFeatures = createSelector(
  [(state: RootState) => state.spotlight.features, (state: RootState) => state.spotlight.readIds],
  (features, readIds) => features.filter((feature) => !readIds.includes(feature.id)),
);

export default spotlightSlice.reducer;
