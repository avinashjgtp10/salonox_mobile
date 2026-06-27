import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
  Staff,
  Client,
} from "../features/bookings/types/booking.types";

// ── Loyalty / rewards helpers ─────────────────────────────────────────────────
export const MEMBERSHIP_TIERS = {
  Silver: 5000,
  Gold: 15000,
  Platinum: 30000,
} as const;

export const EWALLET_REDEEM_MINIMUM = 100;

export function computePointsEarned(billAmount: number): number {
  return Math.floor(billAmount / 10);
}

export function computeEWalletCredit(points: number): number {
  return points * 0.5;
}

export function computeMembership(totalRevenue: number): string {
  if (totalRevenue >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (totalRevenue >= MEMBERSHIP_TIERS.Gold) return "Gold";
  if (totalRevenue >= MEMBERSHIP_TIERS.Silver) return "Silver";
  return "NA";
}

// ── ClientStat shape ──────────────────────────────────────────────────────────
export interface ClientStat {
  clientId: string;
  totalRevenue: number;
  rewardPointsTotal: number;
  ewalletAmt: number;
  membership: string;
  notes?: string;
  staffAlert?: string;
}

// ── Scheduler lookup data ─────────────────────────────────────────────────────
export interface SchedulerService { id: string; name: string; price: number; duration: number }
export interface SchedulerPackage { id: string; name: string; price: number; services: string[] }
export interface SchedulerProduct { id: string; name: string; price: number | null; stock: number; barcode?: string | null }
export interface SchedulerMembership { id: string; name: string; price: number; sessions: number; validFor: string; colour: string }

// ── Staff schedule shape ──────────────────────────────────────────────────────
export interface StaffDaySchedule {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// ── Slice state ───────────────────────────────────────────────────────────────
interface SchedulerState {
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  viewMode: ViewMode;
  currentDate: string;
  interval: IntervalOption;
  clientStats: ClientStat[];
  staffList: Staff[];
  selectedStaffId: string | null;
  clientsList: Client[];
  servicesList: SchedulerService[];
  packagesList: SchedulerPackage[];
  membershipsList: SchedulerMembership[];
  productsList: SchedulerProduct[];
  staffSchedules: Record<string, Record<number, StaffDaySchedule>>;
  scheduleVersion: number;
  dragPatchCache: Record<string, { startTime: string; endTime: string; staffId?: string }>;
  paymentPatchCache: Record<string, { paymentStatus: string; payingNow: number; dueAmount: number; grandTotal?: number }>;
}

const initialState: SchedulerState = {
  bookings: [],
  blockedTimes: [],
  viewMode: "Day",
  currentDate: new Date().toISOString().slice(0, 10),
  interval: "30 Mins",
  clientStats: [],
  staffList: [],
  selectedStaffId: null,
  clientsList: [],
  servicesList: [],
  packagesList: [],
  membershipsList: [],
  productsList: [],
  staffSchedules: {},
  scheduleVersion: 0,
  dragPatchCache: {},
  paymentPatchCache: {},
};

const schedulerSlice = createSlice({
  name: "scheduler",
  initialState,
  reducers: {
    setBookings(state, { payload }: PayloadAction<Booking[]>) {
      state.bookings = payload.map((b) => {
        const drag = state.dragPatchCache[String(b.id)];
        const pay  = state.paymentPatchCache[String(b.id)];
        const merged = drag ? { ...b, ...drag } : { ...b };
        if (pay) {
          // Always trust local cache — it reflects the user's most recent payment action.
          // API often returns stale/incorrect payment_status; cache is always authoritative.
          (merged as any).paymentStatus  = pay.paymentStatus;
          (merged as any).payment_status = pay.paymentStatus.toLowerCase();
          (merged as any).payingNow      = pay.payingNow;
          (merged as any).dueAmount      = pay.paymentStatus === "Paid" ? 0 : pay.dueAmount;
          if (pay.grandTotal !== undefined) (merged as any).grandTotal = pay.grandTotal;
        }
        return merged;
      });
    },
    setDragPatch(state, { payload }: PayloadAction<{ id: string; startTime: string; endTime: string; staffId?: string }>) {
      state.dragPatchCache[String(payload.id)] = {
        startTime: payload.startTime,
        endTime:   payload.endTime,
        ...(payload.staffId ? { staffId: payload.staffId } : {}),
      };
    },
    clearDragPatch(state, { payload }: PayloadAction<string>) {
      delete state.dragPatchCache[String(payload)];
    },
    setStaffList(state, { payload }: PayloadAction<Staff[]>) {
      state.staffList = payload;
    },
    setSelectedStaffId(state, { payload }: PayloadAction<string | null>) {
      state.selectedStaffId = payload;
    },
    setClientsList(state, { payload }: PayloadAction<Client[]>) {
      state.clientsList = payload;
    },
    setServicesList(state, { payload }: PayloadAction<SchedulerService[]>) {
      state.servicesList = payload;
    },
    setPackagesList(state, { payload }: PayloadAction<SchedulerPackage[]>) {
      state.packagesList = payload;
    },
    setMembershipsList(state, { payload }: PayloadAction<SchedulerMembership[]>) {
      state.membershipsList = payload;
    },
    setProductsList(state, { payload }: PayloadAction<SchedulerProduct[]>) {
      state.productsList = payload;
    },
    setStaffSchedules(state, { payload }: PayloadAction<Record<string, Record<number, StaffDaySchedule>>>) {
      state.staffSchedules = payload;
    },
    bumpScheduleVersion(state) {
      state.scheduleVersion += 1;
      state.staffSchedules = {};
    },
    addBooking(state, { payload }: PayloadAction<Booking>) {
      state.bookings.push(payload);
    },
    updateBooking(state, { payload }: PayloadAction<Booking>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.bookings[idx] = payload;
    },
    patchPaymentStatus(
      state,
      { payload }: PayloadAction<{
        id: string;
        paymentStatus: string;
        payingNow?: number;
        dueAmount?: number;
        grandTotal?: number;
        paymentMode?: string;
      }>
    ) {
      const booking = state.bookings.find((b) => String(b.id) === String(payload.id));
      if (booking) {
        (booking as any).paymentStatus  = payload.paymentStatus;
        (booking as any).payment_status = payload.paymentStatus.toLowerCase();
        if (payload.payingNow  !== undefined) (booking as any).payingNow  = payload.payingNow;
        if (payload.dueAmount  !== undefined) (booking as any).dueAmount  = payload.paymentStatus === "Paid" ? 0 : payload.dueAmount;
        if (payload.grandTotal !== undefined) (booking as any).grandTotal = payload.grandTotal;
        if (payload.paymentMode !== undefined) (booking as any).paymentMode = payload.paymentMode;
      }
      state.paymentPatchCache[String(payload.id)] = {
        paymentStatus: payload.paymentStatus,
        payingNow:     payload.payingNow ?? 0,
        dueAmount:     payload.paymentStatus === "Paid" ? 0 : (payload.dueAmount ?? 0),
        grandTotal:    payload.grandTotal,
      };
    },
    replaceBookingId(state, { payload }: PayloadAction<{ localId: string; realId: string }>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.localId);
      if (idx !== -1) state.bookings[idx] = { ...state.bookings[idx], id: payload.realId };
    },
    deleteBooking(state, { payload }: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== payload);
    },
    setBlockedTimes(state, { payload }: PayloadAction<BlockedTime[]>) {
      state.blockedTimes = payload;
    },
    addBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      state.blockedTimes.push(payload);
    },
    updateBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      const idx = state.blockedTimes.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.blockedTimes[idx] = payload;
    },
    replaceBlockedTimeId(state, { payload }: PayloadAction<{ localId: string; realId: string }>) {
      const idx = state.blockedTimes.findIndex((b) => b.id === payload.localId);
      if (idx !== -1) state.blockedTimes[idx] = { ...state.blockedTimes[idx], id: payload.realId };
    },
    deleteBlockedTime(state, { payload }: PayloadAction<string>) {
      state.blockedTimes = state.blockedTimes.filter((b) => b.id !== payload);
    },
    setViewMode(state, { payload }: PayloadAction<ViewMode>) {
      state.viewMode = payload;
    },
    setCurrentDate(state, { payload }: PayloadAction<string>) {
      state.currentDate = payload;
    },
    setInterval(state, { payload }: PayloadAction<IntervalOption>) {
      state.interval = payload;
    },
    navigate(state, { payload: dir }: PayloadAction<1 | -1>) {
      const d = new Date(state.currentDate + "T12:00:00");
      if (state.viewMode === "Day") d.setDate(d.getDate() + dir);
      else if (state.viewMode === "Week" || state.viewMode === "List Week") d.setDate(d.getDate() + dir * 7);
      else if (state.viewMode === "Month") d.setMonth(d.getMonth() + dir);
      state.currentDate = d.toISOString().slice(0, 10);
    },
    updateClientNotes(
      state,
      { payload }: PayloadAction<{ clientId: string; notes: string; staffAlert: string }>
    ) {
      let stat = state.clientStats.find((c) => c.clientId === payload.clientId);
      if (!stat) {
        stat = { clientId: payload.clientId, totalRevenue: 0, rewardPointsTotal: 0, ewalletAmt: 0, membership: "NA" };
        state.clientStats.push(stat);
      }
      stat.notes = payload.notes;
      stat.staffAlert = payload.staffAlert;
    },
    deductEWallet(
      state,
      { payload }: PayloadAction<{ clientId: string; amount: number }>
    ) {
      const stat = state.clientStats.find((c) => c.clientId === payload.clientId);
      if (stat) stat.ewalletAmt = Math.max(0, stat.ewalletAmt - payload.amount);
    },
    processPaymentRewards(
      state,
      { payload }: PayloadAction<{ clientId: string; billAmount: number }>
    ) {
      let stat = state.clientStats.find((c) => c.clientId === payload.clientId);
      if (!stat) {
        stat = { clientId: payload.clientId, totalRevenue: 0, rewardPointsTotal: 0, ewalletAmt: 0, membership: "NA" };
        state.clientStats.push(stat);
      }
      const pts = computePointsEarned(payload.billAmount);
      stat.rewardPointsTotal += pts;
      stat.ewalletAmt        += computeEWalletCredit(pts);
      stat.totalRevenue      += payload.billAmount;
      stat.membership         = computeMembership(stat.totalRevenue);
    },
  },
});

export const {
  setBookings, setDragPatch, clearDragPatch,
  setStaffList, setSelectedStaffId, setClientsList,
  setServicesList, setPackagesList, setMembershipsList, setProductsList,
  setStaffSchedules, bumpScheduleVersion,
  addBooking, updateBooking, patchPaymentStatus, replaceBookingId, deleteBooking,
  setBlockedTimes, addBlockedTime, updateBlockedTime, replaceBlockedTimeId, deleteBlockedTime,
  setViewMode, setCurrentDate, setInterval, navigate,
  updateClientNotes, deductEWallet, processPaymentRewards,
} = schedulerSlice.actions;

export default schedulerSlice.reducer;
