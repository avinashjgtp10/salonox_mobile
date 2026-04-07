/**
 * SchedulerContext.tsx
 *
 * State previously held in a React Context is now owned by Redux (`schedulerSlice`).
 * This file keeps the same public interface so all consumers compile without changes.
 *
 * - `useSchedulerContext()` reads from Redux and returns dispatch-bound callbacks
 *   with the exact same shape as the old context value.
 * - `SchedulerProvider` is kept as a pass-through so existing import sites in
 *   DashboardProviders.tsx continue to compile until that wrapper is removed.
 */
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
  const { bookings, blockedTimes, viewMode, currentDate, interval } =
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
  };
}
