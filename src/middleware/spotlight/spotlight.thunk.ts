import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import { SPOTLIGHT } from "../../services/api/endpoints/spotlight.endpoints";
import type { SpotlightFeature, SpotlightCreatePayload, SpotlightUpdatePayload } from "../../features/feature-spotlight/types";

// Real backend now exists (src/modules/spotlight in the backend repo) — see
// that module's header comments for the API contract. Each thunk keeps the
// same fulfilled-payload shape the old localStorage-backed version returned,
// so no component needed to change when this was swapped in.

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

// Salon-facing (any authenticated salon user) — published features + this
// user's own explored-feature ids.
export const fetchSpotlightFeaturesThunk = createAsyncThunk<
  { features: SpotlightFeature[]; readIds: string[] },
  void,
  { rejectValue: string }
>("spotlight/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SPOTLIGHT.LIST);
    const data = res.data?.data ?? {};
    return { features: data.features ?? [], readIds: data.readIds ?? [] };
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to fetch Spotlight features"));
  }
});

// Superadmin-only — sees draft/published/archived.
export const fetchAdminSpotlightFeaturesThunk = createAsyncThunk<
  SpotlightFeature[],
  void,
  { rejectValue: string }
>("spotlight/fetchAllAdmin", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SPOTLIGHT.ADMIN_LIST);
    return res.data?.data ?? [];
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to fetch Spotlight features"));
  }
});

export const createSpotlightFeatureThunk = createAsyncThunk<
  SpotlightFeature,
  SpotlightCreatePayload,
  { rejectValue: string }
>("spotlight/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(SPOTLIGHT.ADMIN_CREATE, payload);
    return res.data?.data;
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to create Spotlight feature"));
  }
});

export const updateSpotlightFeatureThunk = createAsyncThunk<
  SpotlightFeature,
  { id: string; data: SpotlightUpdatePayload },
  { rejectValue: string }
>("spotlight/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(SPOTLIGHT.ADMIN_UPDATE(id), data);
    return res.data?.data;
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to update Spotlight feature"));
  }
});

// Dedicated publish action — separate from a generic status:"published"
// update so the "New Feature Added" broadcast-to-every-salon notification
// only ever fires from this one deliberate action (the backend also
// guards this server-side: republishing/editing never re-broadcasts).
export const publishSpotlightFeatureThunk = createAsyncThunk<
  SpotlightFeature,
  string,
  { rejectValue: string }
>("spotlight/publish", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(SPOTLIGHT.ADMIN_PUBLISH(id));
    return res.data?.data;
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to publish Spotlight feature"));
  }
});

export const deleteSpotlightFeatureThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("spotlight/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(SPOTLIGHT.ADMIN_DELETE(id));
    return id;
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to delete Spotlight feature"));
  }
});

export const markSpotlightReadThunk = createAsyncThunk<
  string[],
  string,
  { rejectValue: string }
>("spotlight/markRead", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(SPOTLIGHT.EXPLORE(id));
    return res.data?.data?.readIds ?? [];
  } catch (err) {
    return rejectWithValue(errorMessage(err, "Failed to mark Spotlight feature as read"));
  }
});
