import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BOOKING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Booking,
  BookingResponse,
  BookingListResponse,
  CreateBookingPayload,
  UpdateBookingPayload,
} from "../../types/booking.types";

// ── Fetch bookings (scoped to current salon, optional server-side filters) ────
export const fetchBookingsThunk = createAsyncThunk<
  Booking[],
  { staffId?: string; status?: string } | void,
  { rejectValue: string }
>("booking/fetchAll", async (filters, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon.currentSalon?.id;
    const params = new URLSearchParams();
    if (salonId) params.set("salon_id", String(salonId));
    if (filters?.staffId && filters.staffId !== "all") params.set("staff_id", filters.staffId);
    if (filters?.status  && filters.status  !== "all") params.set("status",   filters.status);
    const res = await api.get<BookingListResponse>(`${BOOKING.BASE}?${params.toString()}`);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch bookings");
  }
});

// ── Fetch single booking ───────────────────────────────────────────────────────
export const fetchBookingByIdThunk = createAsyncThunk<
  Booking,
  string | number,
  { rejectValue: string }
>("booking/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<BookingResponse>(BOOKING.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch booking");
  }
});

// ── Create booking ─────────────────────────────────────────────────────────────
export const createBookingThunk = createAsyncThunk<
  Booking,
  CreateBookingPayload,
  { rejectValue: string }
>("booking/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create booking");
  }
});

// ── Update booking ─────────────────────────────────────────────────────────────
export const updateBookingThunk = createAsyncThunk<
  Booking,
  UpdateBookingPayload,
  { rejectValue: string }
>("booking/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<BookingResponse>(BOOKING.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update booking");
  }
});

// ── Delete booking ─────────────────────────────────────────────────────────────
export const deleteBookingThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("booking/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(BOOKING.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete booking");
  }
});

// ── Export bookings (with optional date-range / status / salon filters) ─────────
export const exportBookingsThunk = createAsyncThunk<
  void,
  {
    format: "excel" | "csv";
    filters?: {
      salon_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    };
  },
  { rejectValue: string }
>("booking/export", async ({ format, filters }, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = filters?.salon_id ?? state.salon.currentSalon?.id;
    const url = BOOKING.EXPORT(format, { ...filters, salon_id: salonId });
    const res = await api.get(url, { responseType: "blob" });
    downloadBlob(res.data, `appointments.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export bookings");
  }
});

