import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDigitalMenuThunk,
  saveDigitalMenuThunk,
  fetchPublicDigitalMenuThunk,
} from "../middleware/digitalMenu/digitalMenu.thunk";
import type {
  DigitalMenu,
  PublicMenuResponse,
} from "../features/catalog/types/digitalMenu.types";

export interface DigitalMenuState {
  menu: DigitalMenu | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  publicMenu: PublicMenuResponse | null;
  publicLoading: boolean;
  publicError: string | null;
}

const initialState: DigitalMenuState = {
  menu: null,
  loading: false,
  saving: false,
  error: null,

  publicMenu: null,
  publicLoading: false,
  publicError: null,
};

const digitalMenuSlice = createSlice({
  name: "digitalMenu",
  initialState,
  reducers: {
    clearDigitalMenuError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchDigitalMenuThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDigitalMenuThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.menu = action.payload;
    });
    builder.addCase(fetchDigitalMenuThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? "Failed to load digital menu";
    });

    builder.addCase(saveDigitalMenuThunk.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(saveDigitalMenuThunk.fulfilled, (state, action) => {
      state.saving = false;
      state.menu = action.payload;
    });
    builder.addCase(saveDigitalMenuThunk.rejected, (state, action) => {
      state.saving = false;
      state.error = action.payload ?? "Failed to save digital menu";
    });

    builder.addCase(fetchPublicDigitalMenuThunk.pending, (state) => {
      state.publicLoading = true;
      state.publicError = null;
    });
    builder.addCase(fetchPublicDigitalMenuThunk.fulfilled, (state, action) => {
      state.publicLoading = false;
      state.publicMenu = action.payload;
    });
    builder.addCase(fetchPublicDigitalMenuThunk.rejected, (state, action) => {
      state.publicLoading = false;
      state.publicError = action.payload ?? "Failed to load menu";
    });
  },
});

export const { clearDigitalMenuError } = digitalMenuSlice.actions;
export default digitalMenuSlice.reducer;
