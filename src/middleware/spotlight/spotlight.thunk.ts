import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { spotlightService } from "@/services/spotlight.service";
import type { RootState } from "@/store";
import type { SpotlightList } from "@/types/spotlight";

type SpotlightRejectValue = {
  message: string;
  status?: number;
};

const toRejectValue = (error: unknown): SpotlightRejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  status: error instanceof ApiError ? error.status : undefined,
});

export const fetchSpotlightFeaturesThunk = createAsyncThunk<
  SpotlightList,
  void,
  { rejectValue: SpotlightRejectValue; state: RootState }
>("spotlight/fetchFeatures", async (_arg, { rejectWithValue }) => {
  try {
    return await spotlightService.getFeatures();
  } catch (error) {
    console.error("[Spotlight] Fetch features failed", toRejectValue(error));

    return rejectWithValue(toRejectValue(error));
  }
});
