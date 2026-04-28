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

function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// ✅ Helper — maps every API booking to frontend Booking shape
function mapBooking(appt: any): Booking {
  // Parse HH:MM startTime from scheduled_at ISO string if startTime missing
  let startTime: string = appt.startTime ?? "";
  if (!startTime && appt.scheduled_at) {
    const d = new Date(appt.scheduled_at);
    startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  // Parse HH:MM endTime from ends_at ISO string if endTime missing
  let endTime: string = appt.endTime ?? "";
  if (!endTime && appt.ends_at) {
    const d = new Date(appt.ends_at);
    endTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  // Map services — ensure each service has camelCase staffId
  const services = (appt.services || []).map((s: any) => ({
    ...s,
    staffId: s.staffId || s.staff_id || appt.staffId || appt.staff_id || undefined,
    time: s.time || s.start_time || startTime,
  }));

  // ✅ FIX — compute payingNow/dueAmount from paid_amount so alreadyPaidAmount is always correct
  const grandTotalVal = parseFloat(String(appt.grand_total ?? appt.grandTotal ?? appt.total_amount ?? 0)) || 0;
  const paidAmountVal = Number(appt.paid_amount ?? appt.payingNow ?? 0) || 0;
  const payStatusStr  = (appt.payment_status ?? appt.paymentStatus ?? "").toLowerCase();
  let payingNow = appt.payingNow;
  let dueAmount  = appt.dueAmount;
  // Only recompute when not already set (i.e. raw API response)
  if (payingNow === undefined || payingNow === null) {
    if (paidAmountVal > 0) {
      payingNow = paidAmountVal;
    } else if (payStatusStr === "paid" || payStatusStr === "completed") {
      payingNow = grandTotalVal;
    } else {
      payingNow = 0;
    }
    dueAmount = Math.max(0, grandTotalVal - payingNow);
  }

  return {
    ...appt,
    payment_status: (appt.payment_status ?? "unpaid") as any,
    // ✅ Map snake_case → camelCase so calendar staffId filter works
    paymentStatus: appt.paymentStatus || appt.payment_status || "Unpaid",
    staffId: appt.staffId || appt.staff_id || undefined,
    date: appt.date ? toLocalDateStr(appt.date) : appt.date,
    grandTotal: grandTotalVal || appt.grandTotal,
    startTime,
    endTime,
    services,
    payingNow,
    dueAmount,
  };
}

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
    // ✅ FIX — map every booking so payment_status is never lost
    return res.data.data.map(mapBooking);
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
    // ✅ FIX — map single booking too
    return mapBooking(res.data.data);
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
    return mapBooking(res.data.data);
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
    const res = await api.patch<BookingResponse>(BOOKING.BY_ID(id), data);
    return mapBooking(res.data.data);
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
