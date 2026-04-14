import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Membership, MembershipsListResponse } from "../services/api/endpoints/memberships.endpoints";
import {
  fetchMembershipsThunk,
  fetchMembershipByIdThunk,
  createMembershipThunk,
  updateMembershipThunk,
  deleteMembershipThunk,
} from "../middleware/membership/membership.thunk";

interface MembershipState {
  items: Membership[];
  total: number;
  selectedMembership: Membership | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: MembershipState = {
  items: [],
  total: 0,
  selectedMembership: null,
  loading: false,
  submitting: false,
  error: null,
};

const membershipSlice = createSlice({
  name: "memberships",
  initialState,
  reducers: {
    clearSelectedMembership(state) {
      state.selectedMembership = null;
    },
    clearMembershipError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {

    // fetchAll
    builder
      .addCase(fetchMembershipsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembershipsThunk.fulfilled, (state, action: PayloadAction<MembershipsListResponse>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchMembershipsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchById
    builder
      .addCase(fetchMembershipByIdThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembershipByIdThunk.fulfilled, (state, action: PayloadAction<Membership>) => {
        state.loading = false;
        state.selectedMembership = action.payload;
      })
      .addCase(fetchMembershipByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // create
    builder
      .addCase(createMembershipThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createMembershipThunk.fulfilled, (state, action: PayloadAction<Membership>) => {
        state.submitting = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createMembershipThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });

    // update
    builder
      .addCase(updateMembershipThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateMembershipThunk.fulfilled, (state, action: PayloadAction<Membership>) => {
        state.submitting = false;
        const idx = state.items.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedMembership?.id === action.payload.id) {
          state.selectedMembership = action.payload;
        }
      })
      .addCase(updateMembershipThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });

    // delete
    builder
      .addCase(deleteMembershipThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteMembershipThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.submitting = false;
        state.items = state.items.filter((m) => m.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedMembership?.id === action.payload) {
          state.selectedMembership = null;
        }
      })
      .addCase(deleteMembershipThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSelectedMembership, clearMembershipError } = membershipSlice.actions;
export default membershipSlice.reducer;
