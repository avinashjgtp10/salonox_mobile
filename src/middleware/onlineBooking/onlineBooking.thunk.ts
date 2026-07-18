import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ONLINE_BOOKING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";

export interface PublicSalonDetails {
  salon: any;
  services: any[];
  staff: any[];
}

export interface CreatePublicBookingPayload {
  salon_id: string;
  service_ids: string[];
  staff_id?: string;
  scheduled_at: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_gender?: string;
  notes?: string;
}

export const fetchPublicSalonDetailsThunk = createAsyncThunk<
  PublicSalonDetails,
  string,
  { rejectValue: string }
>("onlineBooking/fetchSalonDetails", async (salon_id, { rejectWithValue }) => {
  try {
    const res = await api.get(ONLINE_BOOKING.SALON_DETAILS(salon_id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch salon details.");
  }
});

export const fetchPublicSalonBySlugThunk = createAsyncThunk<
  PublicSalonDetails,
  string,
  { rejectValue: string }
>("onlineBooking/fetchSalonBySlug", async (slug, { rejectWithValue }) => {
  try {
    const res = await api.get(ONLINE_BOOKING.SALON_BY_SLUG(slug));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch salon details.");
  }
});

export const createPublicBookingThunk = createAsyncThunk<
  any,
  CreatePublicBookingPayload,
  { rejectValue: string }
>("onlineBooking/createBooking", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(ONLINE_BOOKING.CREATE_BOOKING, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create booking.");
  }
});

export interface ManagedBookingParams {
  appointmentId: string;
  token: string;
}

export const fetchManagedBookingThunk = createAsyncThunk<
  any,
  ManagedBookingParams,
  { rejectValue: string }
>("onlineBooking/fetchManagedBooking", async ({ appointmentId, token }, { rejectWithValue }) => {
  try {
    const res = await api.get(ONLINE_BOOKING.MANAGE_BOOKING(appointmentId), { params: { token } });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch booking.");
  }
});

export const cancelManagedBookingThunk = createAsyncThunk<
  any,
  ManagedBookingParams,
  { rejectValue: string }
>("onlineBooking/cancelManagedBooking", async ({ appointmentId, token }, { rejectWithValue }) => {
  try {
    const res = await api.post(ONLINE_BOOKING.CANCEL_MANAGED_BOOKING(appointmentId), { token });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to cancel booking.");
  }
});

export const rescheduleManagedBookingThunk = createAsyncThunk<
  any,
  ManagedBookingParams & { scheduled_at: string },
  { rejectValue: string }
>("onlineBooking/rescheduleManagedBooking", async ({ appointmentId, token, scheduled_at }, { rejectWithValue }) => {
  try {
    const res = await api.patch(ONLINE_BOOKING.RESCHEDULE_MANAGED_BOOKING(appointmentId), { token, scheduled_at });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to reschedule booking.");
  }
});
