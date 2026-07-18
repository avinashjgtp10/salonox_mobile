import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPublicSalonDetailsThunk,
  fetchPublicSalonBySlugThunk,
  createPublicBookingThunk,
  type PublicSalonDetails,
} from "../middleware/onlineBooking/onlineBooking.thunk";

export interface OnlineBookingState {
  salonDetails: PublicSalonDetails | null;
  loading: boolean;
  bookingLoading: boolean;
  error: string | null;
}

const initialState: OnlineBookingState = {
  salonDetails: null,
  loading: false,
  bookingLoading: false,
  error: null,
};

const onlineBookingSlice = createSlice({
  name: "onlineBooking",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchPublicSalonDetailsThunk
    builder.addCase(fetchPublicSalonDetailsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPublicSalonDetailsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.salonDetails = action.payload;
    });
    builder.addCase(fetchPublicSalonDetailsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? "Failed to fetch salon details";
    });

    // fetchPublicSalonBySlugThunk
    builder.addCase(fetchPublicSalonBySlugThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPublicSalonBySlugThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.salonDetails = action.payload;
    });
    builder.addCase(fetchPublicSalonBySlugThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? "Failed to fetch salon details";
    });

    // createPublicBookingThunk
    builder.addCase(createPublicBookingThunk.pending, (state) => {
      state.bookingLoading = true;
      state.error = null;
    });
    builder.addCase(createPublicBookingThunk.fulfilled, (state) => {
      state.bookingLoading = false;
    });
    builder.addCase(createPublicBookingThunk.rejected, (state, action) => {
      state.bookingLoading = false;
      state.error = action.payload ?? "Failed to create booking";
    });
  },
});

export const { clearError } = onlineBookingSlice.actions;
export default onlineBookingSlice.reducer;
