import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BOOKING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Booking,
  BookingResponse,
  CreateBookingPayload,
  UpdateBookingPayload,
} from "../../types/booking.types";

function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function mapBooking(appt: any, servicesList?: any[]): Booking {
  let startTime: string = appt.startTime ?? "";
  if (!startTime && appt.scheduled_at) {
    const d = new Date(appt.scheduled_at);
    startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  let endTime: string = appt.endTime ?? "";
  if (!endTime && appt.ends_at) {
    const d = new Date(appt.ends_at);
    endTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function svcTimeToLocal(svcStartTime: string): string {
    if (!svcStartTime) return startTime;
    if (svcStartTime.includes("T") || svcStartTime.endsWith("Z")) {
      const d = new Date(svcStartTime);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
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
    } catch { return startTime; }
  }

  const services = (appt.services || []).map((s: any) => {
    const svcLookup = servicesList?.find((rs: any) => String(rs.id) === String(s.service_id ?? s.id));
    const sName = s.name || (typeof s.service === "object" ? s.service?.name || s.service?.service : s.service) || s.service_name || svcLookup?.name || "";
    const mappedTime = s.time || (s.start_time ? svcTimeToLocal(s.start_time) : startTime);
    const mappedEndTime: string | undefined = s.endTime || (s.end_time ? svcTimeToLocal(s.end_time) : undefined);
    const duration = Number(s.duration || s.duration_minutes || svcLookup?.duration || 30) || 30;
    const staffNameStr = (() => { const sf = s.staff; if (!sf) return ""; if (typeof sf === "object") return (sf as any)?.name || ""; return String(sf); })();
    return { ...s, name: sName, service: sName, staff: staffNameStr, staffId: s.staffId || s.staff_id || appt.staffId || appt.staff_id || undefined, time: mappedTime, endTime: mappedEndTime, duration };
  });

  if (services.length > 1 && services.every((s: any) => s.time === services[0].time)) {
    const [h0, m0] = (services[0].time || "00:00").split(":").map(Number);
    let runMins = (isNaN(h0) ? 0 : h0) * 60 + (isNaN(m0) ? 0 : m0);
    services.forEach((s: any) => {
      const dur = s.duration || 30;
      s.time = `${String(Math.floor(runMins / 60) % 24).padStart(2, "0")}:${String(runMins % 60).padStart(2, "0")}`;
      const endMins = runMins + dur;
      s.endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
      runMins = endMins;
    });
  }

  const productItems = (appt.product_items || appt.productItems || appt.products || []).map((p: any) => ({
    id: String(p.id ?? ""), productId: String(p.product_id ?? p.productId ?? ""),
    productName: p.product_name ?? p.productName ?? p.name ?? "",
    name: p.product_name ?? p.productName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
    staffId: String(p.staff_id ?? p.staffId ?? ""),
    time: svcTimeToLocal(p.start_time ?? p.time ?? ""),
  }));

  const packageItems = (appt.package_items || appt.packageItems || appt.packages || []).map((p: any) => ({
    id: String(p.id ?? ""), packageId: String(p.package_id ?? p.packageId ?? ""),
    packageName: p.package_name ?? p.packageName ?? p.name ?? "",
    name: p.package_name ?? p.packageName ?? p.name ?? "",
    price: parseFloat(String(p.price ?? 0)) || 0,
    qty: Number(p.qty ?? p.quantity ?? 1) || 1,
    total: parseFloat(String(p.total ?? p.price ?? 0)) || 0,
    staffId: String(p.staff_id ?? p.staffId ?? ""),
    time: svcTimeToLocal(p.start_time ?? p.time ?? ""),
  }));

  const membershipItems = (appt.membership_items || appt.membershipItems || appt.memberships || []).map((m: any) => ({
    id: String(m.id ?? ""), membershipId: String(m.membership_id ?? m.membershipId ?? ""),
    membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
    name: m.membership_name ?? m.membershipName ?? m.name ?? "",
    price: parseFloat(String(m.price ?? 0)) || 0,
    qty: Number(m.qty ?? m.quantity ?? 1) || 1,
    total: parseFloat(String(m.total ?? m.price ?? 0)) || 0,
    staffId: String(m.staff_id ?? m.staffId ?? ""),
    time: svcTimeToLocal(m.start_time ?? m.time ?? ""),
  }));

  const computedTotal = [
    ...(appt.services || []), ...(appt.product_items || []),
    ...(appt.package_items || []), ...(appt.membership_items || []),
  ].reduce((sum: number, item: any) => {
    const itemTotal = parseFloat(String(item.total ?? 0)) || 0;
    if (itemTotal > 0) return sum + itemTotal;
    const price = parseFloat(String(item.price ?? item.unit_price ?? 0)) || 0;
    const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
    return sum + price * qty;
  }, 0);

  const grandTotalVal = parseFloat(String(appt.grand_total ?? appt.grandTotal ?? appt.total_amount ?? 0)) || computedTotal;
  // Trust the API fields directly — recalculating from item totals ignores discounts and causes wrong statuses
  const payingNow = parseFloat(String(appt.paid_amount ?? appt.payingNow ?? 0)) || 0;
  const dueAmount  = parseFloat(String(appt.due_amount  ?? appt.dueAmount  ?? 0)) || 0;

  const rawNotes: string = appt.notes || "";
  const legacySep = "\n Staff Alert: ";
  const legacyIdx = rawNotes.indexOf(legacySep);
  const parsedNotes = appt.staff_alert || appt.staffAlert
    ? rawNotes : (legacyIdx >= 0 ? rawNotes.substring(0, legacyIdx) : rawNotes);
  const parsedStaffAlert = appt.staff_alert || appt.staffAlert ||
    (legacyIdx >= 0 ? rawNotes.substring(legacyIdx + legacySep.length) : undefined);

  const title = (appt.title && appt.title !== "Appointment" && appt.title !== "appointment") ? appt.title : [
    ...services.map((s: any) => s.name || s.service || s.service_name).filter(Boolean),
    ...productItems.map((p: any) => p.name).filter(Boolean),
    ...packageItems.map((p: any) => p.name).filter(Boolean),
    ...membershipItems.map((m: any) => m.name).filter(Boolean),
  ].join(", ") || "Appointment";

  return {
    ...appt, title,
    payment_status: (appt.payment_status ?? "unpaid") as any,
    paymentStatus: (() => {
      // Trust the API's payment_status — it is computed from the payments table by the backend subquery
      // and already accounts for discounts, partial payments, and eWallet deductions correctly.
      const raw = (appt.payment_status ?? appt.paymentStatus ?? "unpaid").toLowerCase();
      if (raw === "paid" || raw === "completed") return "Paid";
      if (raw === "partial") return "Partial";
      if (raw === "cancelled") return "Cancelled";
      return "Unpaid";
    })(),
    staffId:  appt.staffId  || appt.staff_id  || undefined,
    clientId: String(appt.clientId || appt.client_id || appt.client?.id || ""),
    clientName: (() => {
      if (appt.clientName) return appt.clientName;
      if (appt.client_name) return appt.client_name;
      const c = appt.client;
      if (!c) return "";
      return c.fullName || c.full_name || c.name || `${c.first_name || c.firstName || ""} ${c.last_name || c.lastName || ""}`.trim() || "";
    })(),
    date: appt.date ? toLocalDateStr(appt.date) : (appt.scheduled_at ? toLocalDateStr(appt.scheduled_at) : undefined),
    grandTotal: grandTotalVal || appt.grandTotal,
    startTime, endTime, services,
    products: productItems, productItems,
    packages: packageItems, packageItems,
    memberships: membershipItems, membershipItems,
    payingNow, dueAmount,
    paymentMode: appt.paymentMode || appt.payment_method || undefined,
    notes: parsedNotes, staffAlert: parsedStaffAlert,
    discount: parseFloat(String(appt.discount_value ?? 0)) || 0,
    discountType: appt.discount_type === "flat" ? "Flat (₹)" : "Percentage (%)",
    exCharges: parseFloat(String(appt.ex_charges ?? 0)) || 0,
    tipAmount: parseFloat(String(appt.tip_amount ?? 0)) || 0,
    gst: parseFloat(String(appt.gst_percent ?? 0)) || 0,
  };
}

export { mapBooking as mapApiBooking };

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
    const salonId = state.salon.currentSalon?.id;
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

export const confirmBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/confirm", async (id, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.CONFIRM(id)); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to confirm booking"); }
  }
);

export const startBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/start", async (id, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.START(id)); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to start booking"); }
  }
);

export const cancelBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/cancel", async (id, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.CANCEL(id)); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to cancel booking"); }
  }
);

export const noShowBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/noShow", async (id, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.NO_SHOW(id)); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to mark no-show"); }
  }
);

export const checkoutBookingThunk = createAsyncThunk<Booking, { id: string | number; data?: Record<string, any> }, { rejectValue: string }>(
  "booking/checkout", async ({ id, data }, { rejectWithValue }) => {
    try { const res = await api.post<BookingResponse>(BOOKING.CHECKOUT(id), data); return res.data.data; }
    catch (err: any) { if (err instanceof ApiError) return rejectWithValue(err.message); return rejectWithValue("Failed to checkout booking"); }
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