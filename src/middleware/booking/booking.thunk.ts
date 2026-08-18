import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BOOKING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  BookingResponse,
  CreateBookingPayload,
  UpdateBookingPayload,
} from "../../types/booking.types";
import type { Booking } from "../../features/bookings/types";
import { mapApiBooking as mapBooking } from "../../features/bookings/utils/bookingMapper";

export interface BookingFetchFilters {
  staffId?: string; status?: string; page?: number; limit?: number;
  startDate?: string; endDate?: string; allTime?: boolean; search?: string;
}

export interface BookingPaginatedResult {
  data: Booking[];
  pagination: { total: number; page: number; limit: number; total_pages: number };
}

export const fetchBookingsThunk = createAsyncThunk<
  BookingPaginatedResult | Booking[], BookingFetchFilters | void, { rejectValue: string }
>("booking/fetchAll", async (filters, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon?.currentSalon?.id ?? state.auth?.salonId;
    const servicesList = state.scheduler?.servicesList || [];
    const params = new URLSearchParams();
    if (salonId) params.set("salon_id", String(salonId));
    if (filters?.staffId && filters.staffId !== "all") params.set("staff_id", filters.staffId);
    if (filters?.status && filters.status !== "all") params.set("status", filters.status);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (!filters?.allTime) {
      if (filters?.startDate) params.set("start_date", filters.startDate);
      if (filters?.endDate) params.set("end_date", filters.endDate);
    }
    if (filters?.search) {
      const q = filters.search.startsWith("#") ? filters.search.slice(1) : filters.search;
      if (q) params.set("search", q);
    }
    const res = await api.get(`${BOOKING.BASE}?${params.toString()}`);
    const raw = res.data.data as any;
    if (raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.data)) {
      return {
        data: raw.data.map((item: any) => mapBooking(item, servicesList)),
        pagination: { total: raw.totalRecords ?? 0, page: raw.currentPage ?? filters?.page ?? 1, limit: filters?.limit ?? 50, total_pages: raw.totalPages ?? 1 },
      };
    }
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((item: any) => mapBooking(item, servicesList));
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch bookings");
  }
});

export const fetchBookingByIdThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/fetchById", async (id, { rejectWithValue, getState }) => {
    try {
      const res = await api.get<BookingResponse>(BOOKING.BY_ID(id));
      const state = getState() as any;
      return mapBooking(res.data.data, state.scheduler?.servicesList || []);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch booking");
    }
  }
);

export const createBookingThunk = createAsyncThunk<Booking, CreateBookingPayload, { rejectValue: string }>(
  "booking/create", async (payload, { rejectWithValue, getState }) => {
    try {
      const res = await api.post<BookingResponse>(BOOKING.BASE, payload);
      const state = getState() as any;
      return mapBooking(res.data.data, state.scheduler?.servicesList || []);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to create booking");
    }
  }
);

export const updateBookingThunk = createAsyncThunk<Booking, UpdateBookingPayload, { rejectValue: string }>(
  "booking/update", async ({ id, data }, { rejectWithValue, getState }) => {
    try {
      const res = await api.patch<BookingResponse>(BOOKING.BY_ID(id), data);
      const state = getState() as any;
      return mapBooking(res.data.data, state.scheduler?.servicesList || []);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to update booking");
    }
  }
);

export const deleteBookingThunk = createAsyncThunk<string | number, string | number, { rejectValue: string }>(
  "booking/delete", async (id, { rejectWithValue }) => {
    try { await api.delete(BOOKING.BY_ID(id)); return id; }
    catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to delete booking");
    }
  }
);

// Returns the raw (unmapped) API response — callers that need the rich
// Booking shape run it through mapApiBooking themselves (see Scheduler.tsx),
// same as fetchBookingByIdThunk.
export const cancelBookingThunk = createAsyncThunk<any, string | number, { rejectValue: string }>(
  "booking/cancel", async (id, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.CANCEL(id)); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to cancel booking"); }
  }
);

export const checkoutBookingThunk = createAsyncThunk<any, { id: string | number; data?: Record<string, any> }, { rejectValue: string }>(
  "booking/checkout", async ({ id, data }, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.CHECKOUT(id), data); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to checkout booking"); }
  }
);

// Raw PDF bytes, not a link — the caller shares them locally (native share
// sheet or a manual WhatsApp attach) instead of relying on any public URL.
export const fetchReceiptPdfThunk = createAsyncThunk<Blob, string | number, { rejectValue: string }>(
  "booking/fetchReceiptPdf", async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(BOOKING.RECEIPT_PDF(id), { responseType: "blob" });
      return res.data as Blob;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to get the receipt PDF");
    }
  }
);

export const exportBookingsThunk = createAsyncThunk<void, { format: "excel" | "csv" | "pdf"; filters?: { salon_id?: string; status?: string; start_date?: string; end_date?: string } }, { rejectValue: string }>(
  "booking/export", async ({ format, filters }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const salonId = filters?.salon_id ?? state.salon.currentSalon?.id;
      const url = BOOKING.EXPORT(format, { ...filters, salon_id: salonId });
      const res = await api.get(url, { responseType: "blob" });
      const ext = format === "excel" ? "xlsx" : format;
      downloadBlob(res.data, `appointments.${ext}`);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to export bookings");
    }
  }
);