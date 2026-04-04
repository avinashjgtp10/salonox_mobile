import { createSlice } from "@reduxjs/toolkit"
import type { Client } from "../types/client.types"
import {
  fetchClientsThunk,
  fetchClientByIdThunk,
  createClientThunk,
  deleteClientThunk,
  blockClientsThunk,
  exportClientsThunk,
  importClientsThunk,
  mergeDuplicateClientsThunk,
  mergeSelectedClientsThunk,
} from "../middleware/client/client.thunk"

export interface ClientState {
  clients:        Client[]
  selectedClient: Client | null
  loading:        boolean
  error:          string | null
}

const initialState: ClientState = {
  clients:        [],
  selectedClient: null,
  loading:        false,
  error:          null,
}

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {
    clearClientError(state) {
      state.error = null
    },
    clearSelectedClient(state) {
      state.selectedClient = null
    },
  },

  extraReducers: (builder) => {
    // ── fetchClientsThunk ─────────────────────────────────────────────────────
    builder
      .addCase(fetchClientsThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(fetchClientsThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.clients = payload
      })
      .addCase(fetchClientsThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to fetch clients"
      })

    // ── fetchClientByIdThunk ──────────────────────────────────────────────────
    builder
      .addCase(fetchClientByIdThunk.pending, (state) => {
        state.loading        = true
        state.error          = null
        state.selectedClient = null
      })
      .addCase(fetchClientByIdThunk.fulfilled, (state, { payload }) => {
        state.loading        = false
        state.selectedClient = payload
      })
      .addCase(fetchClientByIdThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to fetch client"
      })

    // ── createClientThunk ─────────────────────────────────────────────────────
    builder
      .addCase(createClientThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(createClientThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.clients.push(payload)
      })
      .addCase(createClientThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to create client"
      })

    // ── deleteClientThunk ─────────────────────────────────────────────────────
    builder
      .addCase(deleteClientThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(deleteClientThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.clients = state.clients.filter((c) => c.id !== payload)
      })
      .addCase(deleteClientThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to delete client"
      })

    // ── blockClientsThunk ─────────────────────────────────────────────────────
    builder
      .addCase(blockClientsThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(blockClientsThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        const ids = payload as (string | number)[]
        state.clients = state.clients.map((c) =>
          ids.includes(c.id) ? { ...c, isBlocked: true } : c
        )
      })
      .addCase(blockClientsThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to block clients"
      })

    // ── exportClientsThunk ────────────────────────────────────────────────────
    builder
      .addCase(exportClientsThunk.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(exportClientsThunk.fulfilled, (state) => { state.loading = false })
      .addCase(exportClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to export clients"
      })

    // ── importClientsThunk ────────────────────────────────────────────────────
    builder
      .addCase(importClientsThunk.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(importClientsThunk.fulfilled, (state) => { state.loading = false })
      .addCase(importClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to import clients"
      })

    // ── mergeDuplicateClientsThunk ────────────────────────────────────────────
    builder
      .addCase(mergeDuplicateClientsThunk.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(mergeDuplicateClientsThunk.fulfilled, (state) => { state.loading = false })
      .addCase(mergeDuplicateClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to merge duplicate clients"
      })

    // ── mergeSelectedClientsThunk ─────────────────────────────────────────────
    builder
      .addCase(mergeSelectedClientsThunk.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(mergeSelectedClientsThunk.fulfilled, (state) => { state.loading = false })
      .addCase(mergeSelectedClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Failed to merge clients"
      })
  },
})

export const { clearClientError, clearSelectedClient } = clientSlice.actions
export default clientSlice.reducer
