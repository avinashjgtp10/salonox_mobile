import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { SpotlightFeature } from "../features/feature-spotlight/types";
import {
  fetchSpotlightFeaturesThunk,
  createSpotlightFeatureThunk,
  updateSpotlightFeatureThunk,
  deleteSpotlightFeatureThunk,
  markSpotlightReadThunk,
} from "../middleware/spotlight/spotlight.thunk";
import type { RootState } from "./store";

interface SpotlightState {
  features: SpotlightFeature[];
  readIds: string[];
  fetched: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: SpotlightState = {
  features: [],
  readIds: [],
  fetched: false,
  loading: false,
  error: null,
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
        state.fetched = true;
        state.error = action.payload ?? "Failed to fetch Spotlight features";
      })
      .addCase(createSpotlightFeatureThunk.fulfilled, (state, action) => {
        state.features.unshift(action.payload);
      })
      .addCase(updateSpotlightFeatureThunk.fulfilled, (state, action: PayloadAction<SpotlightFeature>) => {
        const idx = state.features.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.features[idx] = action.payload;
      })
      .addCase(deleteSpotlightFeatureThunk.fulfilled, (state, action) => {
        state.features = state.features.filter((f) => f.id !== action.payload);
      })
      .addCase(markSpotlightReadThunk.fulfilled, (state, action) => {
        state.readIds = action.payload;
      });
  },
});

export default spotlightSlice.reducer;

const selectSpotlightState = (state: RootState) => state.spotlight as SpotlightState;

export const selectSpotlightFeatures = (state: RootState) => selectSpotlightState(state).features;
export const selectSpotlightReadIds = (state: RootState) => selectSpotlightState(state).readIds;

export const selectPublishedFeatures = createSelector(selectSpotlightFeatures, (features) =>
  features.filter((f) => f.status === "published")
);

export const selectNewFeatures = createSelector(
  selectPublishedFeatures,
  selectSpotlightReadIds,
  (published, readIds) => published.filter((f) => !readIds.includes(f.id))
);

export const selectRecentlyUpdated = createSelector(selectPublishedFeatures, (published) => {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return published.filter((f) => new Date(f.updatedAt).getTime() >= cutoff);
});

export const selectUnreadPublishedCount = createSelector(selectNewFeatures, (features) => features.length);
