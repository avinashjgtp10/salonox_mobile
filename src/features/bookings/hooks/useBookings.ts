import { useSchedulerContext } from "../store/SchedulerContext";
import type { Booking } from "../types/scheduler-types";

export function useBookings() {
  const { bookings, addBooking, updateBooking, deleteBooking } =
    useSchedulerContext();

  function getBookingsByDate(date: string): Booking[] {
    return bookings.filter((b) => b.date === date);
  }

  return {
    bookings,
    addBooking,
    updateBooking,
    deleteBooking,
    getBookingsByDate,
  };
}
