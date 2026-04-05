import { createSlice } from "@reduxjs/toolkit"
import type { Staff } from "../types/staff.types"
import {
  fetchStaffThunk,
  fetchStaffByIdThunk,
  createStaffThunk,
  updateStaffThunk,
  deleteStaffThunk,
  exportStaffThunk,
} from "../middleware/staff/staff.thunk"

export interface StaffState {
  staff:         Staff[]
  selectedStaff: Staff | null
  loading:       boolean
  error:         string | null
}

const initialState: StaffState = {
  staff:         [],
  selectedStaff: null,
  loading:       false,
  error:         null,
}

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    clearStaffError(state) {
      state.error = null
    },
    clearSelectedStaff(state) {
      state.selectedStaff = null
    },
  },

  extraReducers: (builder) => {
    // ── fetchStaffThunk ───────────────────────────────────────────────────────
    builder
      .addCase(fetchStaffThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(fetchStaffThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.staff   = payload
      })
      .addCase(fetchStaffThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to fetch staff"
      })

    // ── fetchStaffByIdThunk ───────────────────────────────────────────────────
    builder
      .addCase(fetchStaffByIdThunk.pending, (state) => {
        state.loading        = true
        state.error          = null
        state.selectedStaff  = null
      })
      .addCase(fetchStaffByIdThunk.fulfilled, (state, { payload }) => {
        state.loading        = false
        state.selectedStaff  = payload
      })
      .addCase(fetchStaffByIdThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to fetch staff member"
      })

    // ── createStaffThunk ──────────────────────────────────────────────────────
    builder
      .addCase(createStaffThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(createStaffThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.staff.push(payload)
      })
      .addCase(createStaffThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to create staff member"
      })

    // ── updateStaffThunk ──────────────────────────────────────────────────────
    builder
      .addCase(updateStaffThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(updateStaffThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        const idx     = state.staff.findIndex((s) => s.id === payload.id)
        if (idx !== -1) state.staff[idx] = payload
      })
      .addCase(updateStaffThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to update staff member"
      })

    // ── deleteStaffThunk ──────────────────────────────────────────────────────
    builder
      .addCase(deleteStaffThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(deleteStaffThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.staff   = state.staff.filter((s) => s.id !== payload)
      })
      .addCase(deleteStaffThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to delete staff member"
      })

    // ── exportStaffThunk ──────────────────────────────────────────────────────
    builder
      .addCase(exportStaffThunk.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(exportStaffThunk.fulfilled, (state) => { state.loading = false })
      .addCase(exportStaffThunk.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to export staff"
      })
  },
})

export const { clearStaffError, clearSelectedStaff } = staffSlice.actions
export default staffSlice.reducer
