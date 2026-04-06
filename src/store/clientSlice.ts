import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Client } from "../types/client.types";
import {
  fetchClientsThunk,
  fetchClientByIdThunk,
  createClientThunk,
  deleteClientThunk,
  exportClientsThunk,
  blockClientsThunk,
  unblockClientsThunk,
  importClientsThunk,
  mergeDuplicateClientsThunk,
  mergeSelectedClientsThunk,
} from "../middleware/client/client.thunk";

const clientSlice = createCRUDSlice<Client>({
  name: "client",
  thunks: {
    fetchAllThunk:  fetchClientsThunk,
    fetchByIdThunk: fetchClientByIdThunk,
    createThunk:    createClientThunk,
    // updateThunk omitted — clients have no PUT update endpoint
    deleteThunk:    deleteClientThunk,
    exportThunk:    exportClientsThunk,
  },

  // ── Domain-specific extra reducers ────────────────────────────────────────
  extraReducers: (builder) => {
    // block
    builder
      .addCase(blockClientsThunk.pending, (state) => { state.loading = true;  state.error = null; })
      .addCase(blockClientsThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const ids = payload as (string | number)[];
        state.items = state.items.map((c) =>
          ids.includes(c.id) ? { ...c, isBlocked: true } : c,
        );
      })
      .addCase(blockClientsThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to block clients";
      });

    // unblock
    builder
      .addCase(unblockClientsThunk.pending, (state) => { state.loading = true;  state.error = null; })
      .addCase(unblockClientsThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const ids = payload as (string | number)[];
        state.items = state.items.map((c) =>
          ids.includes(c.id) ? { ...c, isBlocked: false } : c,
        );
      })
      .addCase(unblockClientsThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to unblock clients";
      });

    // import
    builder
      .addCase(importClientsThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(importClientsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(importClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to import clients";
      });

    // merge duplicates
    builder
      .addCase(mergeDuplicateClientsThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(mergeDuplicateClientsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(mergeDuplicateClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to merge duplicate clients";
      });

    // merge selected
    builder
      .addCase(mergeSelectedClientsThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(mergeSelectedClientsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(mergeSelectedClientsThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to merge clients";
      });
  },
});

export const { clearError: clearClientError, clearSelectedItem: clearSelectedClient } = clientSlice.actions;
export default clientSlice.reducer;
