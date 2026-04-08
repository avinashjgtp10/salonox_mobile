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
    fetchAllThunk: fetchClientsThunk,
    fetchByIdThunk: fetchClientByIdThunk,
    createThunk: createClientThunk,
    // updateThunk omitted — clients have no PUT update endpoint
    deleteThunk: deleteClientThunk,
    exportThunk: exportClientsThunk,
  },

  extraInitialLoading: {
    block: false,
    unblock: false,
    import: false,
    mergeDuplicates: false,
    mergeSelected: false,
  },

  // ── Domain-specific extra reducers ────────────────────────────────────────
  extraReducers: (builder) => {
    // block
    builder
      .addCase(blockClientsThunk.pending, (state) => {
        state.loading.block = true;
        state.error = null;
      })
      .addCase(blockClientsThunk.fulfilled, (state, { payload }) => {
        state.loading.block = false;
        const ids = payload as (string | number)[];
        state.items = state.items.map((c) =>
          ids.includes(c.id) ? { ...c, isBlocked: true } : c,
        );
      })
      .addCase(blockClientsThunk.rejected, (state, { payload }) => {
        state.loading.block = false;
        state.error = (payload as string) ?? "Failed to block clients";
      });

    // unblock
    builder
      .addCase(unblockClientsThunk.pending, (state) => {
        state.loading.unblock = true;
        state.error = null;
      })
      .addCase(unblockClientsThunk.fulfilled, (state, { payload }) => {
        state.loading.unblock = false;
        const ids = payload as (string | number)[];
        state.items = state.items.map((c) =>
          ids.includes(c.id) ? { ...c, isBlocked: false } : c,
        );
      })
      .addCase(unblockClientsThunk.rejected, (state, { payload }) => {
        state.loading.unblock = false;
        state.error = (payload as string) ?? "Failed to unblock clients";
      });

    // import
    builder
      .addCase(importClientsThunk.pending, (state) => {
        state.loading.import = true;
        state.error = null;
      })
      .addCase(importClientsThunk.fulfilled, (state) => {
        state.loading.import = false;
      })
      .addCase(importClientsThunk.rejected, (state, { payload }) => {
        state.loading.import = false;
        state.error = payload ?? "Failed to import clients";
      });

    // merge duplicates
    builder
      .addCase(mergeDuplicateClientsThunk.pending, (state) => {
        state.loading.mergeDuplicates = true;
        state.error = null;
      })
      .addCase(mergeDuplicateClientsThunk.fulfilled, (state) => {
        state.loading.mergeDuplicates = false;
      })
      .addCase(mergeDuplicateClientsThunk.rejected, (state, { payload }) => {
        state.loading.mergeDuplicates = false;
        state.error = payload ?? "Failed to merge duplicate clients";
      });

    // merge selected
    builder
      .addCase(mergeSelectedClientsThunk.pending, (state) => {
        state.loading.mergeSelected = true;
        state.error = null;
      })
      .addCase(mergeSelectedClientsThunk.fulfilled, (state) => {
        state.loading.mergeSelected = false;
      })
      .addCase(mergeSelectedClientsThunk.rejected, (state, { payload }) => {
        state.loading.mergeSelected = false;
        state.error = payload ?? "Failed to merge clients";
      });
  },
});

export const {
  clearError: clearClientError,
  clearSelectedItem: clearSelectedClient,
} = clientSlice.actions;
export default clientSlice.reducer;
