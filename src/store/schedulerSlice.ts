import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
} from "../features/bookings/types/scheduler-types";
import {
  INITIAL_BOOKINGS,
  INITIAL_BLOCKED,
} from "../features/bookings/utils/schedulerMockData";

// ── Loyalty / rewards helpers ────────────────────────────────────────────────
export const MEMBERSHIP_TIERS = {
  Silver: 5000,
  Gold: 15000,
  Platinum: 30000,
} as const;

export const EWALLET_REDEEM_MINIMUM = 100;

/** 1 point per ₹10 spent */
export function computePointsEarned(billAmount: number): number {
  return Math.floor(billAmount / 10);
}

/** ₹0.50 eWallet credit per point */
export function computeEWalletCredit(points: number): number {
  return points * 0.5;
}

/** Returns tier label based on lifetime revenue */
export function computeMembership(totalRevenue: number): string {
  if (totalRevenue >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (totalRevenue >= MEMBERSHIP_TIERS.Gold) return "Gold";
  if (totalRevenue >= MEMBERSHIP_TIERS.Silver) return "Silver";
  return "NA";
}

// ── ClientStat shape ─────────────────────────────────────────────────────────
export interface ClientStat {
  clientId: string;
  totalRevenue: number;
  rewardPointsTotal: number;
  ewalletAmt: number;
  membership: string;
  notes?: string;
  staffAlert?: string;
}

// ── Slice state ──────────────────────────────────────────────────────────────
interface SchedulerState {
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  viewMode: ViewMode;
  currentDate: string;
  interval: IntervalOption;
  clientStats: ClientStat[];
}

const initialState: SchedulerState = {
  bookings: INITIAL_BOOKINGS,
  blockedTimes: INITIAL_BLOCKED,
  viewMode: "Day",
  currentDate: new Date().toISOString().slice(0, 10),
  interval: "30 Mins",
  clientStats: [],
};

const schedulerSlice = createSlice({
  name: "scheduler",
  initialState,
  reducers: {
    addBooking(state, { payload }: PayloadAction<Booking>) {
      state.bookings.push(payload);
    },
    updateBooking(state, { payload }: PayloadAction<Booking>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.bookings[idx] = payload;
    },
    deleteBooking(state, { payload }: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== payload);
    },
    addBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      state.blockedTimes.push(payload);
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
      else if (state.viewMode === "Week" || state.viewMode === "List Week")
        d.setDate(d.getDate() + dir * 7);
      else if (state.viewMode === "Month") d.setMonth(d.getMonth() + dir);
      state.currentDate = d.toISOString().slice(0, 10);
    },

    // ── Client stats reducers ──────────────────────────────────────────────
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
      if (stat) {
        stat.ewalletAmt = Math.max(0, stat.ewalletAmt - payload.amount);
      }
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
      stat.ewalletAmt += computeEWalletCredit(pts);
      stat.totalRevenue += payload.billAmount;
      stat.membership = computeMembership(stat.totalRevenue);
    },
  },
});

export const {
  addBooking,
  updateBooking,
  deleteBooking,
  addBlockedTime,
  deleteBlockedTime,
  setViewMode,
  setCurrentDate,
  setInterval,
  navigate,
  updateClientNotes,
  deductEWallet,
  processPaymentRewards,
} = schedulerSlice.actions;

export default schedulerSlice.reducer;