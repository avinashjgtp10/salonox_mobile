import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { MARKETPLACE } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  MarketplaceProfileFull,
  WorkingHoursDay,
  Amenity,
  Highlight,
  Value,
} from "../../types/marketplace.types";

export const fetchMarketplaceProfileThunk = createAsyncThunk<
  MarketplaceProfileFull,
  void,
  { rejectValue: string }
>("marketplace/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(MARKETPLACE.PROFILE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch marketplace profile.");
  }
});

export const updateMarketplaceEssentialsThunk = createAsyncThunk<
  void,
  { display_name: string; business_phone?: string; business_phone_country_code?: string; business_email?: string; },
  { rejectValue: string }
>("marketplace/updateEssentials", async (payload, { rejectWithValue }) => {
  try {
    await api.put(MARKETPLACE.ESSENTIALS, payload);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update essentials.");
  }
});

export const updateMarketplaceAboutThunk = createAsyncThunk<
  void,
  { venue_description: string; },
  { rejectValue: string }
>("marketplace/updateAbout", async (payload, { rejectWithValue }) => {
  try {
    await api.put(MARKETPLACE.ABOUT, payload);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update about section.");
  }
});

export const updateMarketplaceLocationThunk = createAsyncThunk<
  void,
  { address_line: string; city?: string; state?: string; country?: string; postal_code?: string; latitude?: number; longitude?: number; },
  { rejectValue: string }
>("marketplace/updateLocation", async (payload, { rejectWithValue }) => {
  try {
    await api.put(MARKETPLACE.LOCATION, payload);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update location.");
  }
});

export const updateMarketplaceWorkingHoursThunk = createAsyncThunk<
  void,
  { days: WorkingHoursDay[] },
  { rejectValue: string }
>("marketplace/updateWorkingHours", async (payload, { rejectWithValue }) => {
  try {
    await api.put(MARKETPLACE.WORKING_HOURS, payload);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update working hours.");
  }
});

export const updateMarketplaceFeaturesThunk = createAsyncThunk<
  void,
  { amenities?: Amenity[]; highlights?: Highlight[]; values?: Value[] },
  { rejectValue: string }
>("marketplace/updateFeatures", async (payload, { rejectWithValue }) => {
  try {
    await api.put(MARKETPLACE.FEATURES, payload);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update features.");
  }
});

export const publishMarketplaceThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("marketplace/publish", async (_, { rejectWithValue }) => {
  try {
    await api.post(MARKETPLACE.PUBLISH);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to publish profile.");
  }
});

export const unpublishMarketplaceThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("marketplace/unpublish", async (_, { rejectWithValue }) => {
  try {
    await api.post(MARKETPLACE.UNPUBLISH);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to unpublish profile.");
  }
});
