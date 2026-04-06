import { BOOKING } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { Booking, CreateBookingPayload } from "../../types/booking.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const bookingThunks = createCRUDThunks<Booking, CreateBookingPayload, Partial<CreateBookingPayload>>(
  "booking",
  BOOKING,
  "booking",
);

export const {
  fetchAllThunk:  fetchBookingsThunk,
  fetchByIdThunk: fetchBookingByIdThunk,
  createThunk:    createBookingThunk,
  updateThunk:    updateBookingThunk,
  deleteThunk:    deleteBookingThunk,
  exportThunk:    exportBookingsThunk,
} = bookingThunks;
