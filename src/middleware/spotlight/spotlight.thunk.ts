import { createAsyncThunk } from "@reduxjs/toolkit";
import type { SpotlightFeature, SpotlightCreatePayload, SpotlightUpdatePayload } from "../../features/feature-spotlight/types";
import {
  getAllFeatures,
  saveFeatures,
  getReadIds,
  markIdRead,
} from "../../features/feature-spotlight/utils/spotlightStorage";

// Backed by localStorage for now — no Spotlight endpoints exist on the
// backend yet. Each thunk keeps the same async/rejectWithValue shape a real
// `api.get/post/put/delete` call would use, so swapping in real endpoints
// later only touches the body of these thunks, not any component.

export const fetchSpotlightFeaturesThunk = createAsyncThunk<
  { features: SpotlightFeature[]; readIds: string[] },
  void,
  { rejectValue: string }
>("spotlight/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return { features: getAllFeatures(), readIds: getReadIds() };
  } catch {
    return rejectWithValue("Failed to fetch Spotlight features");
  }
});

export const createSpotlightFeatureThunk = createAsyncThunk<
  SpotlightFeature,
  SpotlightCreatePayload,
  { rejectValue: string }
>("spotlight/create", async (payload, { rejectWithValue }) => {
  try {
    const now = new Date().toISOString();
    const feature: SpotlightFeature = {
      ...payload,
      id: `spotlight-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const features = [feature, ...getAllFeatures()];
    saveFeatures(features);
    return feature;
  } catch {
    return rejectWithValue("Failed to create Spotlight feature");
  }
});

export const updateSpotlightFeatureThunk = createAsyncThunk<
  SpotlightFeature,
  { id: string; data: SpotlightUpdatePayload },
  { rejectValue: string }
>("spotlight/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const features = getAllFeatures();
    const idx = features.findIndex((f) => f.id === id);
    if (idx === -1) return rejectWithValue("Spotlight feature not found");
    const updated: SpotlightFeature = {
      ...features[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    features[idx] = updated;
    saveFeatures(features);
    return updated;
  } catch {
    return rejectWithValue("Failed to update Spotlight feature");
  }
});

export const deleteSpotlightFeatureThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("spotlight/delete", async (id, { rejectWithValue }) => {
  try {
    const features = getAllFeatures().filter((f) => f.id !== id);
    saveFeatures(features);
    return id;
  } catch {
    return rejectWithValue("Failed to delete Spotlight feature");
  }
});

export const markSpotlightReadThunk = createAsyncThunk<
  string[],
  string,
  { rejectValue: string }
>("spotlight/markRead", async (id, { rejectWithValue }) => {
  try {
    return markIdRead(id);
  } catch {
    return rejectWithValue("Failed to mark Spotlight feature as read");
  }
});
