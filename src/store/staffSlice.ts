import { castDraft } from "immer";
import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Staff } from "../types/staff.types";
import {
  fetchStaffThunk,
  fetchStaffByIdThunk,
  createStaffThunk,
  updateStaffThunk,
  deleteStaffThunk,
  exportStaffThunk,
  activateStaffThunk,
  deactivateStaffThunk,
} from "../middleware/staff/staff.thunk";

const staffSlice = createCRUDSlice<Staff>({
  name: "staff",
  thunks: {
    fetchAllThunk: fetchStaffThunk,
    fetchByIdThunk: fetchStaffByIdThunk,
    createThunk: createStaffThunk,
    updateThunk: updateStaffThunk,
    deleteThunk: deleteStaffThunk,
    exportThunk: exportStaffThunk,
  },
  extraInitialLoading: {
    activate: false,
    deactivate: false,
  },
  extraReducers: (builder) => {
    // ── activate ──────────────────────────────────────────────────────────────
    builder
      .addCase(activateStaffThunk.pending, (state) => {
        state.loading.activate = true;
        state.error = null;
      })
      .addCase(activateStaffThunk.fulfilled, (state, { payload }) => {
        state.loading.activate = false;
        const idx = state.items.findIndex((i) => (i as Staff).id === (payload as Staff).id);
        if (idx !== -1) state.items[idx] = castDraft({ ...state.items[idx], is_active: true } as Staff);
        if (state.selectedItem && (state.selectedItem as Staff).id === (payload as Staff).id) {
          state.selectedItem = castDraft({ ...state.selectedItem, is_active: true } as Staff);
        }
      })
      .addCase(activateStaffThunk.rejected, (state, { payload }) => {
        state.loading.activate = false;
        state.error = (payload as string) ?? "Failed to activate staff member";
      });

    // ── deactivate ────────────────────────────────────────────────────────────
    builder
      .addCase(deactivateStaffThunk.pending, (state) => {
        state.loading.deactivate = true;
        state.error = null;
      })
      .addCase(deactivateStaffThunk.fulfilled, (state, { payload }) => {
        state.loading.deactivate = false;
        const idx = state.items.findIndex((i) => (i as Staff).id === (payload as Staff).id);
        if (idx !== -1) state.items[idx] = castDraft({ ...state.items[idx], is_active: false } as Staff);
        if (state.selectedItem && (state.selectedItem as Staff).id === (payload as Staff).id) {
          state.selectedItem = castDraft({ ...state.selectedItem, is_active: false } as Staff);
        }
      })
      .addCase(deactivateStaffThunk.rejected, (state, { payload }) => {
        state.loading.deactivate = false;
        state.error = (payload as string) ?? "Failed to deactivate staff member";
      });
  },
});

export const {
  clearError: clearStaffError,
  clearSelectedItem: clearSelectedStaff,
} = staffSlice.actions;
export default staffSlice.reducer;