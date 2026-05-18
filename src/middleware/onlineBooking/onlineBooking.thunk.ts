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
  service_id: string;
  staff_id?: string;
  scheduled_at: string;
  client_name: string;
  client_email: string;
  client_phone: string;
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
