import { createSlice } from "@reduxjs/toolkit";
import type { Booking } from "../types/booking.types";
import {
  fetchBookingsThunk,
  fetchBookingByIdThunk,
  createBookingThunk,
  updateBookingThunk,
  deleteBookingThunk,
  exportBookingsThunk,
} from "../middleware/booking/booking.thunk";

export interface BookingState {
  bookings:        Booking[];
  selectedBooking: Booking | null;
  loading:         boolean;
  error:           string | null;
}

const initialState: BookingState = {
  bookings:        [],
  selectedBooking: null,
  loading:         false,
  error:           null,
}

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    clearBookingError(state) {
      state.error = null;
    },
    clearSelectedBooking(state) {
      state.selectedBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookingsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchBookingsThunk.fulfilled, (state, { payload }) => { state.loading = false; state.bookings = payload; })
      .addCase(fetchBookingsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })
      
      .addCase(fetchBookingByIdThunk.pending, (state) => { state.loading = true; state.error = null; state.selectedBooking = null; })
      .addCase(fetchBookingByIdThunk.fulfilled, (state, { payload }) => { state.loading = false; state.selectedBooking = payload; })
      .addCase(fetchBookingByIdThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(createBookingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createBookingThunk.fulfilled, (state, { payload }) => { state.loading = false; state.bookings.push(payload); })
      .addCase(createBookingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(updateBookingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateBookingThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.bookings.findIndex((b) => b.id === payload.id);
        if (idx !== -1) state.bookings[idx] = payload;
      })
      .addCase(updateBookingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(deleteBookingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteBookingThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.bookings  = state.bookings.filter((b) => b.id !== payload);
      })
      .addCase(deleteBookingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })
      
      .addCase(exportBookingsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(exportBookingsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportBookingsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; });
  },
})

export const { clearBookingError, clearSelectedBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
