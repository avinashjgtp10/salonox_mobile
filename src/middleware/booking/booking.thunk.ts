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
function mapBooking(appt: any, servicesList?: any[]): Booking {
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

  // Convert a service's start_time (possibly UTC HH:MM from DB) to local time.
  // Uses the booking's scheduled_at ISO string as the timezone reference.
  function svcTimeToLocal(svcStartTime: string): string {
    if (!svcStartTime) return startTime;
    // Full ISO datetime — parse directly to local
    if (svcStartTime.includes("T") || svcStartTime.endsWith("Z")) {
      const d = new Date(svcStartTime);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    // HH:MM — apply the same UTC→local offset as the booking's scheduled_at
    if (!appt.scheduled_at || !startTime) return svcStartTime;
    try {
      const bookingDate = new Date(appt.scheduled_at);
      const bookingUtcMins = bookingDate.getUTCHours() * 60 + bookingDate.getUTCMinutes();
      const [bh, bm] = startTime.split(":").map(Number);
      const tzOffsetMins = bh * 60 + bm - bookingUtcMins;
      const [sh, sm] = svcStartTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm)) return startTime;
      const svcLocalMins = ((sh * 60 + sm) + tzOffsetMins + 24 * 60) % (24 * 60);
      return `${String(Math.floor(svcLocalMins / 60)).padStart(2, "0")}:${String(svcLocalMins % 60).padStart(2, "0")}`;
    } catch {
      return startTime;
    }
  }

  // Map services — ensure each service has camelCase staffId and LOCAL time
  const services = (appt.services || []).map((s: any) => {
    const svcLookup = servicesList?.find((rs: any) => String(rs.id) === String(s.service_id ?? s.id));
    const sName = s.name || (typeof s.service === "object" ? s.service?.name || s.service?.service : s.service) || s.service_name || svcLookup?.name || "";
    return {
      ...s,
      name: sName,
      service: sName,
      staffId: s.staffId || s.staff_id || appt.staffId || appt.staff_id || undefined,
      // s.time: custom field (local if returned by backend); s.start_time may be UTC HH:MM from DB
      time: s.time || (s.start_time ? svcTimeToLocal(s.start_time) : startTime),
    };
  });

  // Map products, packages, memberships to camelCase
  const productItems = (appt.product_items || appt.productItems || appt.products || []).map((p: any) => ({
    id: String(p.id ?? ""),
    productId: String(p.product_id ?? p.productId ?? ""),
    productName: p.product_name ?? p.productName ?? p.name ?? "",
    name: p.product_name ?? p.productName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
  }));

  const packageItems = (appt.package_items || appt.packageItems || appt.packages || []).map((p: any) => ({
    id: String(p.id ?? ""),
    packageId: String(p.package_id ?? p.packageId ?? ""),
    packageName: p.package_name ?? p.packageName ?? p.name ?? "",
    name: p.package_name ?? p.packageName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
  }));

  const membershipItems = (appt.membership_items || appt.membershipItems || appt.memberships || []).map((m: any) => ({
    id: String(m.id ?? ""),
    membershipId: String(m.membership_id ?? m.membershipId ?? ""),
    membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
    name: m.membership_name ?? m.membershipName ?? m.name ?? "",
    price: parseFloat(String(m.price ?? 0)) || 0,
    qty: Number(m.qty ?? m.quantity ?? 1) || 1,
    total: parseFloat(String(m.total ?? m.price ?? 0)) || 0,
  }));

  // ✅ FIX — compute payingNow/dueAmount from paid_amount so alreadyPaidAmount is always correct
  const grandTotalVal = parseFloat(String(appt.grand_total ?? appt.grandTotal ?? appt.total_amount ?? 0)) || 0;
  const paidAmountVal = Number(appt.paid_amount ?? appt.payingNow ?? 0) || 0;
  const payStatusStr = (appt.payment_status ?? appt.paymentStatus ?? "").toLowerCase();
  let payingNow = appt.payingNow;
  let dueAmount = appt.dueAmount;
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

  // Parse staff_alert and notes separately — support both new separate fields and old concatenated format
  const rawNotes: string = appt.notes || "";
  const legacySep = "\n Staff Alert: ";
  const legacyIdx = rawNotes.indexOf(legacySep);
  const parsedNotes = appt.staff_alert || appt.staffAlert
    ? rawNotes
    : (legacyIdx >= 0 ? rawNotes.substring(0, legacyIdx) : rawNotes);
  const parsedStaffAlert = appt.staff_alert || appt.staffAlert ||
    (legacyIdx >= 0 ? rawNotes.substring(legacyIdx + legacySep.length) : undefined);

  // ── Build combined title from all booking item types ──────────────────────
  const title = (appt.title && appt.title !== "Appointment" && appt.title !== "appointment") ? appt.title : [
    ...(services || []).map((s: any) => s.name || s.service || s.service_name).filter(Boolean),
    ...(productItems || []).map((p: any) => p.name).filter(Boolean),
    ...(packageItems || []).map((p: any) => p.name).filter(Boolean),
    ...(membershipItems || []).map((m: any) => m.name).filter(Boolean),
  ].join(", ") || "Appointment";

  return {
    ...appt,
    title,
    payment_status: (appt.payment_status ?? "unpaid") as any,
    // ✅ Map snake_case → camelCase so calendar staffId filter works
    paymentStatus: appt.paymentStatus || appt.payment_status || "Unpaid",
    staffId: appt.staffId || appt.staff_id || undefined,
    // ✅ FIX — derive date from scheduled_at if date field is missing (prevents undefined dates that break calendar filters)
    date: appt.date 
      ? toLocalDateStr(appt.date) 
      : (appt.scheduled_at ? toLocalDateStr(appt.scheduled_at) : undefined),
    grandTotal: grandTotalVal || appt.grandTotal,
    startTime,
    endTime,
    services,
    products: productItems,
    productItems,
    packages: packageItems,
    packageItems,
    memberships: membershipItems,
    membershipItems,
    payingNow,
    dueAmount,
    notes: parsedNotes,
    staffAlert: parsedStaffAlert,
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
    const servicesList = state.scheduler?.servicesList || [];
    const params = new URLSearchParams();
    if (salonId) params.set("salon_id", String(salonId));
    if (filters?.staffId && filters.staffId !== "all") params.set("staff_id", filters.staffId);
    if (filters?.status && filters.status !== "all") params.set("status", filters.status);
    const res = await api.get<BookingListResponse>(`${BOOKING.BASE}?${params.toString()}`);
    // ✅ FIX — map every booking so payment_status is never lost
    return res.data.data.map((item: any) => mapBooking(item, servicesList));
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
>("booking/fetchById", async (id, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<BookingResponse>(BOOKING.BY_ID(id));
    const state = getState() as any;
    const servicesList = state.scheduler?.servicesList || [];
    // ✅ FIX — map single booking too
    return mapBooking(res.data.data, servicesList);
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
>("booking/create", async (payload, { rejectWithValue, getState }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.BASE, payload);
    const state = getState() as any;
    const servicesList = state.scheduler?.servicesList || [];
    return mapBooking(res.data.data, servicesList);
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
>("booking/update", async ({ id, data }, { rejectWithValue, getState }) => {
  try {
    const res = await api.patch<BookingResponse>(BOOKING.BY_ID(id), data);
    const state = getState() as any;
    const servicesList = state.scheduler?.servicesList || [];
    return mapBooking(res.data.data, servicesList);
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

// ── Status transitions ─────────────────────────────────────────────────────────
export const confirmBookingThunk = createAsyncThunk<
  Booking,
  string | number,
  { rejectValue: string }
>("booking/confirm", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.CONFIRM(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to confirm booking");
  }
});

export const startBookingThunk = createAsyncThunk<
  Booking,
  string | number,
  { rejectValue: string }
>("booking/start", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.START(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to start booking");
  }
});

export const cancelBookingThunk = createAsyncThunk<
  Booking,
  string | number,
  { rejectValue: string }
>("booking/cancel", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.CANCEL(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to cancel booking");
  }
});

export const noShowBookingThunk = createAsyncThunk<
  Booking,
  string | number,
  { rejectValue: string }
>("booking/noShow", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.NO_SHOW(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to mark no-show");
  }
});

export const checkoutBookingThunk = createAsyncThunk<
  Booking,
  { id: string | number; data?: Record<string, any> },
  { rejectValue: string }
>("booking/checkout", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.post<BookingResponse>(BOOKING.CHECKOUT(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to checkout booking");
  }
});

// ── Export bookings (with optional date-range / status / salon filters) ─────────
export const exportBookingsThunk = createAsyncThunk<
  void,
  {
    format: "excel" | "csv" | "pdf";
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
    const ext = format === "excel" ? "xlsx" : format;
    downloadBlob(res.data, `appointments.${ext}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export bookings");
  }
});
