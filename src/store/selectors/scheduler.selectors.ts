import type { RootState } from "../store";
import type { Booking, Staff, BlockedTime } from "../../features/bookings/types";

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
export const selectServicesList    = (state: RootState) => state.scheduler.servicesList    ?? [];
export const selectPackagesList    = (state: RootState) => state.scheduler.packagesList    ?? [];
export const selectMembershipsList = (state: RootState) => state.scheduler.membershipsList ?? [];
export const selectProductsList    = (state: RootState) => state.scheduler.productsList    ?? [];
export const selectClientsList     = (state: RootState) => state.scheduler.clientsList     ?? [];
export const selectStaffSchedules  = (state: RootState) => state.scheduler.staffSchedules  ?? {};

// ─── Patch caches ─────────────────────────────────────────────────────────────
export const selectDragPatchCache = (state: RootState) =>
  state.scheduler.dragPatchCache ?? {};

export const selectPaymentPatchCache = (state: RootState) =>
  state.scheduler.paymentPatchCache ?? {};

export const selectPaymentPatchById = (id: string | number) =>
  (state: RootState) =>
    (state.scheduler.paymentPatchCache ?? {})[String(id)];
