import type { ReactNode } from "react";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import {
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
} from "../../../store/schedulerSlice";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
} from "../types/scheduler-types";

// No-op wrapper — Redux is initialised at the app root via <Provider store={store}>.
export function SchedulerProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSchedulerContext() {
  const dispatch = useAppDispatch();
  const { bookings, blockedTimes, viewMode, currentDate, interval, clientStats } =
    useAppSelector((s) => s.scheduler);

  return {
    bookings,
    addBooking: (b: Booking) => dispatch(addBooking(b)),
    updateBooking: (b: Booking) => dispatch(updateBooking(b)),
    deleteBooking: (id: string) => dispatch(deleteBooking(id)),
    blockedTimes,
    addBlockedTime: (bt: BlockedTime) => dispatch(addBlockedTime(bt)),
    deleteBlockedTime: (id: string) => dispatch(deleteBlockedTime(id)),
    viewMode,
    setViewMode: (v: ViewMode) => dispatch(setViewMode(v)),
    currentDate,
    setCurrentDate: (d: string) => dispatch(setCurrentDate(d)),
    interval,
    setInterval: (i: IntervalOption) => dispatch(setInterval(i)),
    navigate: (dir: 1 | -1) => dispatch(navigate(dir)),
    // ── New — client stats with live updates ─────────────────────────────
    clientStats,
    updateClientNotes: (clientId: string, notes: string, staffAlert: string) =>
      dispatch(updateClientNotes({ clientId, notes, staffAlert })),
    deductEWallet: (clientId: string, amount: number) =>
      dispatch(deductEWallet({ clientId, amount })),
    processPaymentRewards: (clientId: string, billAmount: number) =>
      dispatch(processPaymentRewards({ clientId, billAmount })),
  };
}