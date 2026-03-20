import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Booking, BlockedTime, ViewMode, IntervalOption } from "../types/scheduler-types";
import { INITIAL_BOOKINGS, INITIAL_BLOCKED } from "../utils/schedulerMockData";

interface SchedulerContextType {
  bookings: Booking[];
  addBooking: (b: Booking) => void;
  updateBooking: (b: Booking) => void;
  deleteBooking: (id: string) => void;
  blockedTimes: BlockedTime[];
  addBlockedTime: (bt: BlockedTime) => void;
  deleteBlockedTime: (id: string) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  currentDate: string;
  setCurrentDate: (d: string) => void;
  interval: IntervalOption;
  setInterval: (i: IntervalOption) => void;
  navigate: (dir: 1 | -1) => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const today = new Date().toISOString().slice(0, 10);

  const [bookings,     setBookings]     = useState<Booking[]>(INITIAL_BOOKINGS);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>(INITIAL_BLOCKED);
  const [viewMode,     setViewMode]     = useState<ViewMode>("Day");
  const [currentDate,  setCurrentDate]  = useState<string>(today);
  const [interval,     setInterval]     = useState<IntervalOption>("30 Mins");

  function addBooking(b: Booking)            { setBookings(prev => [...prev, b]); }
  function updateBooking(b: Booking)         { setBookings(prev => prev.map(x => x.id === b.id ? b : x)); }
  function deleteBooking(id: string)         { setBookings(prev => prev.filter(x => x.id !== id)); }
  function addBlockedTime(bt: BlockedTime)   { setBlockedTimes(prev => [...prev, bt]); }
  function deleteBlockedTime(id: string)     { setBlockedTimes(prev => prev.filter(x => x.id !== id)); }

  function navigate(dir: 1 | -1) {
    // Append T12:00:00 to keep the day from jumping due to timezone offsets
    const d = new Date(currentDate + "T12:00:00");
    if (viewMode === "Day")                                   d.setDate(d.getDate() + dir);
    else if (viewMode === "Week" || viewMode === "List Week") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "Month")                            d.setMonth(d.getMonth() + dir);
    setCurrentDate(d.toISOString().slice(0, 10));
  }

  return (
    <SchedulerContext.Provider value={{
      bookings, addBooking, updateBooking, deleteBooking,
      blockedTimes, addBlockedTime, deleteBlockedTime,
      viewMode, setViewMode,
      currentDate, setCurrentDate,
      interval, setInterval,
      navigate,
    }}>
      {children}
    </SchedulerContext.Provider>
  );
}

export function useSchedulerContext(): SchedulerContextType {
  const ctx = useContext(SchedulerContext);
  if (!ctx) throw new Error("useSchedulerContext must be used inside SchedulerProvider");
  return ctx;
}
