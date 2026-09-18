import type { RootState } from "../store";
import type { Booking, Staff, BlockedTime } from "../../features/bookings/types";

// Stable fallback references — a fresh [] / {} literal returned from a
// selector is a new reference on every call, which trips React-Redux's
// "selector returned a different result" stability warning (and causes
// needless rerenders) even though the underlying state hasn't changed.
const EMPTY_ARR: never[] = [];
const EMPTY_OBJ: Record<string, never> = {};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const selectBookings = (state: RootState): Booking[] =>
  state.scheduler.bookings as Booking[];

export const selectBookingById = (id: string | number) =>
  (state: RootState): Booking | undefined =>
    (state.scheduler.bookings as Booking[]).find((b) => String(b.id) === String(id));

export const selectBookingsByDate = (date: string) =>
  (state: RootState): Booking[] =>
    (state.scheduler.bookings as Booking[]).filter((b) => b.date === date);

// ─── Staff ────────────────────────────────────────────────────────────────────
export const selectStaffList = (state: RootState): Staff[] =>
  state.scheduler.staffList as Staff[];

export const selectSelectedStaffIds = (state: RootState): string[] =>
  state.scheduler.selectedStaffIds;

// ─── Blocked times ────────────────────────────────────────────────────────────
export const selectBlockedTimes = (state: RootState): BlockedTime[] =>
  state.scheduler.blockedTimes as BlockedTime[];

// ─── View / date / interval ───────────────────────────────────────────────────
export const selectViewMode   = (state: RootState) => state.scheduler.viewMode;
export const selectCurrentDate = (state: RootState): string => state.scheduler.currentDate;
export const selectInterval   = (state: RootState) => state.scheduler.interval;

// ─── Catalog lists ────────────────────────────────────────────────────────────
export const selectServicesList    = (state: RootState) => state.scheduler.servicesList    ?? EMPTY_ARR;
export const selectPackagesList    = (state: RootState) => state.scheduler.packagesList    ?? EMPTY_ARR;
export const selectMembershipsList = (state: RootState) => state.scheduler.membershipsList ?? EMPTY_ARR;
export const selectProductsList    = (state: RootState) => state.scheduler.productsList    ?? EMPTY_ARR;
export const selectClientsList     = (state: RootState) => state.scheduler.clientsList     ?? EMPTY_ARR;
export const selectStaffSchedules  = (state: RootState) => state.scheduler.staffSchedules  ?? EMPTY_OBJ;

// ─── Patch caches ─────────────────────────────────────────────────────────────
export const selectDragPatchCache = (state: RootState) =>
  state.scheduler.dragPatchCache ?? EMPTY_OBJ;

export const selectPaymentPatchCache = (state: RootState) =>
  state.scheduler.paymentPatchCache ?? EMPTY_OBJ;

export const selectPaymentPatchById = (id: string | number) =>
  (state: RootState) =>
    (state.scheduler.paymentPatchCache ?? {})[String(id)];
