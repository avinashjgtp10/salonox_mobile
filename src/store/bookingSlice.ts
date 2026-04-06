import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Booking } from "../types/booking.types";
import {
  fetchBookingsThunk,
  fetchBookingByIdThunk,
  createBookingThunk,
  updateBookingThunk,
  deleteBookingThunk,
  exportBookingsThunk,
} from "../middleware/booking/booking.thunk";

const bookingSlice = createCRUDSlice<Booking>({
  name: "booking",
  thunks: {
    fetchAllThunk:  fetchBookingsThunk,
    fetchByIdThunk: fetchBookingByIdThunk,
    createThunk:    createBookingThunk,
    updateThunk:    updateBookingThunk,
    deleteThunk:    deleteBookingThunk,
    exportThunk:    exportBookingsThunk,
  },
});

export const { clearError: clearBookingError, clearSelectedItem: clearSelectedBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
