import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BOOKING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  Booking,
  BookingResponse,
  BookingListResponse,
  CreateBookingPayload,
  UpdateBookingPayload,
} from "../../types/booking.types";

export const fetchBookingsThunk = createAsyncThunk<Booking[], void, { rejectValue: string }>(
  "booking/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<BookingListResponse>(BOOKING.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch bookings");
  }
});

export const fetchBookingByIdThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<BookingResponse>(BOOKING.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch booking");
  }
});

export const createBookingThunk = createAsyncThunk<Booking, CreateBookingPayload, { rejectValue: string }>(
  "booking/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create booking");
  }
});

export const updateBookingThunk = createAsyncThunk<Booking, UpdateBookingPayload, { rejectValue: string }>(
  "booking/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<BookingResponse>(BOOKING.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update booking");
  }
});

export const deleteBookingThunk = createAsyncThunk<string | number, string | number, { rejectValue: string }>(
  "booking/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(BOOKING.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete booking");
  }
});

export const exportBookingsThunk = createAsyncThunk<void, "excel" | "csv", { rejectValue: string }>(
  "booking/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(BOOKING.EXPORT(format), { responseType: "blob" });
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `bookings.${format === "excel" ? "xlsx" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export bookings");
  }
});
