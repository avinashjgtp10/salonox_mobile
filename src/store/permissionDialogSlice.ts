import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Global "Access Denied" popup, shown whenever any API call comes back with
// the backend's standard permission-denial 403 (see interceptors.ts) — one
// place instead of every component's own catch block having to remember to
// show something for this case.
interface PermissionDialogState {
  open: boolean;
  message: string;
}

const initialState: PermissionDialogState = {
  open: false,
  message: "",
};

const permissionDialogSlice = createSlice({
  name: "permissionDialog",
  initialState,
  reducers: {
    showPermissionDenied(state, action: PayloadAction<string>) {
      state.open = true;
      state.message = action.payload;
    },
    hidePermissionDenied(state) {
      state.open = false;
    },
  },
});

export const { showPermissionDenied, hidePermissionDenied } = permissionDialogSlice.actions;
export default permissionDialogSlice.reducer;
