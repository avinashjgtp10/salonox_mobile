import { createSlice } from "@reduxjs/toolkit";

import { fetchStaffAvailabilityThunk } from "@/middleware/staff/staffAvailability.thunk";
import type { RootState } from "@/store";
import type { StaffAvailability } from "@/types/staffAvailability";

type StaffAvailabilityState = {
  availabilityByKey: Record<string, StaffAvailability | null>;
  errorByKey: Record<string, string | null>;
  loadingKeys: string[];
};

const initialState: StaffAvailabilityState = {
  availabilityByKey: {},
  errorByKey: {},
  loadingKeys: [],
};

const getAvailabilityKey = (staffId?: string | null, date?: string | null) =>
  staffId && date ? `${staffId}:${date}` : "";

const staffAvailabilitySlice = createSlice({
  name: "staffAvailability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffAvailabilityThunk.pending, (state, action) => {
        const key = getAvailabilityKey(action.meta.arg.staffId, action.meta.arg.date);

        state.errorByKey[key] = null;
        state.loadingKeys = state.loadingKeys.includes(key) ? state.loadingKeys : [...state.loadingKeys, key];
      })
      .addCase(fetchStaffAvailabilityThunk.fulfilled, (state, action) => {
        const { date, ...availability } = action.payload;
        const { staffId } = availability;
        const key = getAvailabilityKey(staffId, date);

        state.availabilityByKey[key] = availability;
        state.loadingKeys = state.loadingKeys.filter((loadingKey) => loadingKey !== key);
      })
      .addCase(fetchStaffAvailabilityThunk.rejected, (state, action) => {
        const key = getAvailabilityKey(action.meta.arg.staffId, action.meta.arg.date);

        state.errorByKey[key] =
          action.payload?.message ?? action.error.message ?? "Unable to load staff availability.";
        state.loadingKeys = state.loadingKeys.filter((loadingKey) => loadingKey !== key);
      });
  },
});

export const selectStaffAvailability = (
  state: RootState,
  staffId?: string | null,
  date?: string | null,
) => state.staffAvailability.availabilityByKey[getAvailabilityKey(staffId, date)] ?? null;

export const selectStaffAvailabilityLoading = (
  state: RootState,
  staffId?: string | null,
  date?: string | null,
) => state.staffAvailability.loadingKeys.includes(getAvailabilityKey(staffId, date));

export const selectStaffAvailabilityError = (
  state: RootState,
  staffId?: string | null,
  date?: string | null,
) => state.staffAvailability.errorByKey[getAvailabilityKey(staffId, date)] ?? null;

export default staffAvailabilitySlice.reducer;
