import { createSlice } from "@reduxjs/toolkit";
import type { ClientMembership } from "../services/api/endpoints/clientMemberships.endpoints";
import {
  fetchClientMembershipsThunk,
  fetchClientMembershipByIdThunk,
  purchaseClientMembershipThunk,
  consumeSessionThunk,
  cancelClientMembershipThunk,
} from "../middleware/clientMembership/clientMembership.thunk";

interface ClientMembershipState {
  items: ClientMembership[];
  total: number;
  selected: ClientMembership | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: ClientMembershipState = {
  items:      [],
  total:      0,
  selected:   null,
  loading:    false,
  submitting: false,
  error:      null,
};

const clientMembershipSlice = createSlice({
  name: "clientMemberships",
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null; },
    clearError(state)    { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // fetch all
      .addCase(fetchClientMembershipsThunk.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchClientMembershipsThunk.fulfilled, (s, { payload }) => {
        s.loading = false; s.items = payload.items; s.total = payload.total;
      })
      .addCase(fetchClientMembershipsThunk.rejected, (s, { payload }) => {
        s.loading = false; s.error = payload ?? "Error";
      })

      // fetch by id
      .addCase(fetchClientMembershipByIdThunk.pending,   (s) => { s.loading = true; })
      .addCase(fetchClientMembershipByIdThunk.fulfilled, (s, { payload }) => {
        s.loading = false; s.selected = payload;
      })
      .addCase(fetchClientMembershipByIdThunk.rejected, (s, { payload }) => {
        s.loading = false; s.error = payload ?? "Error";
      })

      // purchase
      .addCase(purchaseClientMembershipThunk.pending,   (s) => { s.submitting = true; s.error = null; })
      .addCase(purchaseClientMembershipThunk.fulfilled, (s, { payload }) => {
        s.submitting = false; s.items.unshift(payload); s.total += 1;
      })
      .addCase(purchaseClientMembershipThunk.rejected, (s, { payload }) => {
        s.submitting = false; s.error = payload ?? "Error";
      })

      // consume
      .addCase(consumeSessionThunk.pending,   (s) => { s.submitting = true; s.error = null; })
      .addCase(consumeSessionThunk.fulfilled, (s, { payload }) => {
        s.submitting = false;
        const idx = s.items.findIndex(i => i.id === payload.id);
        if (idx >= 0) s.items[idx] = payload;
        if (s.selected?.id === payload.id) s.selected = payload;
      })
      .addCase(consumeSessionThunk.rejected, (s, { payload }) => {
        s.submitting = false; s.error = payload ?? "Error";
      })

      // cancel
      .addCase(cancelClientMembershipThunk.pending,   (s) => { s.submitting = true; })
      .addCase(cancelClientMembershipThunk.fulfilled, (s, { payload }) => {
        s.submitting = false;
        const idx = s.items.findIndex(i => i.id === payload);
        if (idx >= 0) s.items[idx] = { ...s.items[idx], status: "cancelled" };
        if (s.selected?.id === payload) s.selected = null;
      })
      .addCase(cancelClientMembershipThunk.rejected, (s, { payload }) => {
        s.submitting = false; s.error = payload ?? "Error";
      });
  },
});

export const { clearSelected, clearError } = clientMembershipSlice.actions;
export default clientMembershipSlice.reducer;
