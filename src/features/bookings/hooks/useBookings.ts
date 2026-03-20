import { useSchedulerContext } from "../store/SchedulerContext";
import type { Booking } from "../types/scheduler-types";

export function useBookings() {
  const { bookings, addBooking, updateBooking, deleteBooking } = useSchedulerContext();

  function getBookingsByDate(date: string): Booking[] {
    return bookings.filter(b => b.date === date);
  }

  function getBookingsByStaffAndDate(staffId: string, date: string): Booking[] {
    return bookings.filter(b => b.staffId === staffId && b.date === date);
  }

  function getBookingById(id: string): Booking | undefined {
    return bookings.find(b => b.id === id);
  }

  return {
    bookings,
    addBooking,
    updateBooking,
    deleteBooking,
    getBookingsByDate,
    getBookingsByStaffAndDate,
    getBookingById,
  };
}
