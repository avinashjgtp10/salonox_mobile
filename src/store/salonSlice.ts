import { createSlice } from "@reduxjs/toolkit"
import {
  saveSalonThunk,
  getMySalonThunk,
  getSalonByIdThunk,
  updateSalonThunk,
} from "../middleware/salon/salon.thunk"
import type { Salon } from "../types/salon.types"

interface SalonState {
  currentSalon: Salon | null
  loading:      boolean
  error:        string | null
}

const initialState: SalonState = {
  currentSalon: null,
  loading:      false,
  error:        null,
}

const salonSlice = createSlice({
  name: "salon",
  initialState,
  reducers: {
    clearSalon(state) {
      state.currentSalon = null
      state.error        = null
    },
  },
  extraReducers: (builder) => {

    // ── Save (Create or Update) ───────────────────────────────────────────────
    builder
      .addCase(saveSalonThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(saveSalonThunk.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.currentSalon = payload.salon
      })
      .addCase(saveSalonThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Something went wrong"
      })

    // ── Get My Salon ──────────────────────────────────────────────────────────
    builder
      .addCase(getMySalonThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(getMySalonThunk.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.currentSalon = payload
      })
      .addCase(getMySalonThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Something went wrong"
      })

    // ── Get By ID ─────────────────────────────────────────────────────────────
    builder
      .addCase(getSalonByIdThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(getSalonByIdThunk.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.currentSalon = payload
      })
      .addCase(getSalonByIdThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Something went wrong"
      })

    // ── Update ────────────────────────────────────────────────────────────────
    builder
      .addCase(updateSalonThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(updateSalonThunk.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.currentSalon = payload
      })
      .addCase(updateSalonThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Something went wrong"
      })
  },
})

export const { clearSalon } = salonSlice.actions
export default salonSlice.reducer
