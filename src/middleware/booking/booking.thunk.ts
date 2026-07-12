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

  // Detect package-covered appointments: payment_method=package with paid_amount=0 means ₹0 to client.
  // We store catalog total (e.g. ₹150) in DB so grand_total>0, but display must show ₹0.
  // No paid_status check — "package" payment_method alone signals coverage (works for both Unpaid and Paid states).
  const isPackagePaid =
    ((appt.payment_method || appt.paymentMode || "").toLowerCase() === "package") &&
    (parseFloat(String(appt.paid_amount ?? appt.payingNow ?? 0)) || 0) === 0;

  const services = (appt.services || []).map((s: any) => {
    const svcLookup = servicesList?.find((rs: any) => String(rs.id) === String(s.service_id ?? s.id));
    const sName = s.name || (typeof s.service === "object" ? s.service?.name || s.service?.service : s.service) || s.service_name || svcLookup?.name || "";
    const mappedTime = s.time || (s.start_time ? svcTimeToLocal(s.start_time) : startTime);
    const mappedEndTime: string | undefined = s.endTime || (s.end_time ? svcTimeToLocal(s.end_time) : undefined);
    const duration = Number(s.duration || s.duration_minutes || svcLookup?.duration || 30) || 30;
    const staffNameStr = (() => { const sf = s.staff; if (!sf) return ""; if (typeof sf === "object") return (sf as any)?.name || ""; return String(sf); })();
    const sPrice = parseFloat(String(s.price ?? 0)) || 0;
    const sQty   = Number(s.qty ?? s.quantity ?? 1) || 1;
    const sTotal = parseFloat(String(s.total ?? 0)) || 0;
    const derivedDiscount = (sTotal > 0 && sPrice * sQty > sTotal)
      ? Math.round((sPrice * sQty - sTotal) * 100) / 100
      : (parseFloat(String(s.discount ?? 0)) || 0);
    const rawSvcStaffId = s.staffId || s.staff_id || appt.staffId || appt.staff_id;
    const isServiceFromPackage = !!(s.is_package_service || (s as any).isPackageService);
    return { ...s, ...(isPackagePaid || isServiceFromPackage ? { total: 0 } : {}), isPackageService: isServiceFromPackage, name: sName, service: sName, staff: staffNameStr, staffId: rawSvcStaffId ? String(rawSvcStaffId) : undefined, time: mappedTime, endTime: mappedEndTime, duration, discount: derivedDiscount };
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

  // Same back-derivation as services above — see bookingMapper.ts for rationale.
  const deriveRowDiscount = (price: number, qty: number, total: number, rawDiscount: unknown) =>
    (total > 0 && price * qty > total)
      ? Math.round(((price * qty - total) / (price * qty)) * 100 * 100) / 100
      : (parseFloat(String(rawDiscount ?? 0)) || 0);

  const productItems = (appt.product_items || appt.productItems || appt.products || []).map((p: any) => {
    const pPrice = parseFloat(String(p.price ?? 0)) || 0;
    const pQty   = Number(p.qty ?? p.quantity ?? 1) || 1;
    const pTotal = parseFloat(String(p.total ?? p.price ?? 0)) || 0;
    return {
      id: String(p.id ?? ""), productId: String(p.product_id ?? p.productId ?? ""),
      productName: p.product_name ?? p.productName ?? p.name ?? "",
      name: p.product_name ?? p.productName ?? p.name ?? "",
      price: pPrice,
      qty: pQty,
      total: pTotal,
      discount: deriveRowDiscount(pPrice, pQty, pTotal, p.discount),
      staffId: String(p.staff_id ?? p.staffId ?? ""),
      time: svcTimeToLocal(p.start_time ?? p.time ?? ""),
    };
  });

  const packageItems = (appt.package_items || appt.packageItems || appt.packages || []).map((p: any) => {
    const isPkgService = !!(p.is_package_service || (p as any).isPackageService);
    const pPrice = parseFloat(String(p.price ?? 0)) || 0;
    const pQty   = Number(p.qty ?? p.quantity ?? 1) || 1;
    const pTotal = parseFloat(String(p.total ?? p.price ?? 0)) || 0;
    return {
      id: String(p.id ?? ""), packageId: String(p.package_id ?? p.packageId ?? ""),
      packageName: p.package_name ?? p.packageName ?? p.name ?? "",
      name: p.package_name ?? p.packageName ?? p.name ?? "",
      price: pPrice,
      qty: pQty,
      isPackageService: isPkgService,
      total: isPkgService ? 0 : pTotal,
      discount: isPkgService ? 0 : deriveRowDiscount(pPrice, pQty, pTotal, p.discount),
      staffId: String(p.staff_id ?? p.staffId ?? ""),
      time: svcTimeToLocal(p.start_time ?? p.time ?? ""),
    };
  });

  const membershipItems = (appt.membership_items || appt.membershipItems || appt.memberships || []).map((m: any) => {
    const mPrice = parseFloat(String(m.price ?? 0)) || 0;
    const mQty   = Number(m.qty ?? m.quantity ?? 1) || 1;
    const mTotal = parseFloat(String(m.total ?? m.price ?? 0)) || 0;
    return {
      id: String(m.id ?? ""), membershipId: String(m.membership_id ?? m.membershipId ?? ""),
      membershipName: m.membership_name ?? m.membershipName ?? m.name ?? "",
      name: m.membership_name ?? m.membershipName ?? m.name ?? "",
      price: mPrice,
      qty: mQty,
      total: mTotal,
      discount: deriveRowDiscount(mPrice, mQty, mTotal, m.discount),
      staffId: String(m.staff_id ?? m.staffId ?? ""),
      time: svcTimeToLocal(m.start_time ?? m.time ?? ""),
    };
  });

  const computedTotal = [
    ...(appt.services || []), ...(appt.product_items || []),
    ...(appt.package_items || []), ...(appt.membership_items || []),
  ].reduce((sum: number, item: any) => {
    const rawItemTotal = item.total;
    // Respect explicit total=0 (package-covered); only fall back to price*qty when total is absent
    if (rawItemTotal !== null && rawItemTotal !== undefined) {
      return sum + (parseFloat(String(rawItemTotal)) || 0);
    }
    const price = parseFloat(String(item.price ?? item.unit_price ?? 0)) || 0;
    const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
    return sum + price * qty;
  }, 0);

  // Use ?? (not ||) so grand_total=0 is trusted as 0, not fallen through to computedTotal
  const rawGrandTotal = appt.grand_total ?? appt.grandTotal ?? appt.total_amount;
  const hasPerServicePackage = services.some((s: any) => s.isPackageService)
    || packageItems.some((p: any) => p.isPackageService);
  const grandTotalVal = isPackagePaid ? 0
    : hasPerServicePackage
      ? Math.max(0, [...services, ...productItems, ...packageItems, ...membershipItems]
          .reduce((sum, item: any) => sum + (Number(item.total) || 0), 0))
      : ((rawGrandTotal !== null && rawGrandTotal !== undefined)
          ? (parseFloat(String(rawGrandTotal)) || 0)
          : computedTotal);
  const payingNow = parseFloat(String(appt.paid_amount ?? appt.payingNow ?? 0)) || 0;
  const rawDueAmount = parseFloat(String(appt.due_amount ?? appt.dueAmount ?? 0)) || 0;
  const dueAmount = isPackagePaid ? 0
    : hasPerServicePackage ? Math.max(0, parseFloat((grandTotalVal - payingNow).toFixed(2)))
    : rawDueAmount;

  // Subtotal / discount / taxable amount — see bookingMapper.ts for rationale
  const subtotalVal = parseFloat(String(appt.subtotal ?? 0)) || computedTotal;

  const discountValueRaw = parseFloat(String(appt.discount_value ?? appt.discount ?? 0)) || 0;
  const discountTypeRaw  = (appt.discount_type || "").toLowerCase();

  let discountAmountVal = parseFloat(String(appt.discount_amount ?? appt.discountAmount ?? 0)) || 0;
  if (discountAmountVal === 0 && discountValueRaw > 0) {
    if (discountTypeRaw === "flat") {
      discountAmountVal = discountValueRaw;
    } else {
      const svcBase = services.reduce((sum: number, s: any) => sum + (parseFloat(String(s.total ?? s.price ?? 0)) || 0), 0)
        + packageItems.reduce((sum: number, p: any) => sum + (parseFloat(String(p.total ?? p.price ?? 0)) || 0), 0)
        + membershipItems.reduce((sum: number, m: any) => sum + (parseFloat(String(m.total ?? m.price ?? 0)) || 0), 0);
      const base = svcBase > 0 ? svcBase : subtotalVal;
      discountAmountVal = Math.round((base * discountValueRaw / 100) * 100) / 100;
    }
  }

  const taxableAmountVal = parseFloat(String(appt.taxable_amount ?? appt.taxableAmount ?? 0))
    || Math.max(0, subtotalVal - discountAmountVal);

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

  const rawPaymentStatus = (() => {
    const raw = (appt.payment_status ?? appt.paymentStatus ?? "unpaid").toLowerCase();
    if (raw === "paid" || raw === "completed") return "Paid";
    if (raw === "partial") return "Partial";
    if (raw === "cancelled") return "Cancelled";
    return "Unpaid";
  })();

  return {
    ...appt, title,
    invoiceNumber: appt.invoice_number ? Number(appt.invoice_number) : undefined,
    isDeleted: !!(appt.deleted_at ?? appt.deletedAt),
    serviceStartedAt: appt.service_started_at ?? appt.serviceStartedAt ?? null,
    serviceEndedAt: appt.service_ended_at ?? appt.serviceEndedAt ?? null,
    payment_status: (appt.payment_status ?? "unpaid") as any,
    // When package-covered items bring our recomputed due to 0, the backend's payments table may still
    // show "partial" (it used the old grand_total that included catalog prices). Override to "Paid".
    paymentStatus: (hasPerServicePackage && dueAmount === 0 && payingNow > 0) ? "Paid" : rawPaymentStatus,
    staffId: (() => { const raw = appt.staffId || appt.staff_id || packageItems.find((p: any) => p.staffId)?.staffId; return raw ? String(raw) : undefined; })(),
    clientId: String(appt.clientId || appt.client_id || appt.client?.id || ""),
    clientName: (() => {
      if (appt.clientName) return appt.clientName;
      if (appt.client_name) return appt.client_name;
      const c = appt.client;
      if (!c) return "";
      return c.fullName || c.full_name || c.name || `${c.first_name || c.firstName || ""} ${c.last_name || c.lastName || ""}`.trim() || "";
    })(),
    clientPhone:    appt.clientPhone    || appt.client_phone    || appt.client?.phone  || appt.client?.mobile || "",
    clientEmail:    appt.clientEmail    || appt.client_email    || appt.client?.email  || "",
    clientGst:      appt.clientGst      || appt.client_gst      || appt.client?.gst_number || appt.client?.gst || "",
    loyaltyPoints:  appt.loyaltyPoints  ?? appt.loyalty_points  ?? appt.client?.loyalty_points ?? null,
    membershipName: appt.membershipName || appt.membership_name || (appt.memberships || appt.membership_items || [])[0]?.membership_name || (appt.memberships || appt.membership_items || [])[0]?.name || "",
    date: appt.date ? toLocalDateStr(appt.date) : (appt.scheduled_at ? toLocalDateStr(appt.scheduled_at) : undefined),
    grandTotal: isPackagePaid ? 0 : (grandTotalVal || appt.grandTotal),
    startTime, endTime, services,
    products: productItems, productItems,
    packages: packageItems, packageItems,
    memberships: membershipItems, membershipItems,
    payingNow, dueAmount,
    paymentMode: appt.paymentMode || appt.payment_method || undefined,
    membershipWalletUsed: parseFloat(String(appt.membership_wallet_used ?? appt.membershipWalletUsed ?? 0)) || 0,
    applyMembershipWallet: !!(appt.apply_membership_wallet ?? appt.applyMembershipWallet),
    ewalletUsed: parseFloat(String(appt.ewallet_used ?? appt.ewalletUsed ?? 0)) || 0,
    splitDetails: (() => {
      const raw = appt.split_details ?? appt.splitDetails;
      if (!raw) return undefined;
      const obj = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      return (obj && typeof obj === "object") ? obj : undefined;
    })(),
    notes: parsedNotes, staffAlert: parsedStaffAlert,
    discount: parseFloat(String(appt.discount_value ?? 0)) || 0,
    discountAmount: discountAmountVal,
    discountType: appt.discount_type === "flat" ? "Flat (₹)" : "Percentage (%)",
    exCharges: parseFloat(String(appt.ex_charges ?? 0)) || 0,
    tipAmount: parseFloat(String(appt.tip_amount ?? 0)) || 0,
    gst: parseFloat(String(appt.gst_percent ?? 0)) || 0,
    subtotal: subtotalVal,
    taxableAmount: taxableAmountVal,
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
    const salonId = state.salon?.currentSalon?.id ?? state.auth?.user?.salon_id;
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

// Client service check-in/check-out (calendar tooltip toggle). Mapped through
// mapBooking (unlike the plain status-transition thunks above) because
// check-in reschedules the appointment server-side — the caller needs
// startTime/endTime/date already resolved to local values so it can patch the
// booking into Redux and have the calendar block visually slide to the live
// time slot.
export const serviceCheckInBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/serviceCheckIn", async (id, { rejectWithValue, getState }) => {
    try {
      const res = await api.post<BookingResponse>(BOOKING.SERVICE_CHECKIN(id));
      const state = getState() as any;
      return mapBooking(res.data.data, state.scheduler?.servicesList || []);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to check in");
    }
  }
);

export const serviceCheckOutBookingThunk = createAsyncThunk<Booking, string | number, { rejectValue: string }>(
  "booking/serviceCheckOut", async (id, { rejectWithValue, getState }) => {
    try {
      const res = await api.post<BookingResponse>(BOOKING.SERVICE_CHECKOUT(id));
      const state = getState() as any;
      return mapBooking(res.data.data, state.scheduler?.servicesList || []);
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to check out");
    }
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