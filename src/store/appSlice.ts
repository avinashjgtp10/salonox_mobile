import { createSlice } from "@reduxjs/toolkit";
import type { ExternalApp } from "../types/app.types";
import {
  fetchAppsThunk,
  fetchAppByIdThunk,
  connectAppThunk,
  updateAppThunk,
  disconnectAppThunk,
  exportAppsThunk,
} from "../middleware/app/app.thunk";

export interface AppState {
  apps:        ExternalApp[];
  selectedApp: ExternalApp | null;
  loading:     boolean;
  error:       string | null;
}

const initialState: AppState = {
  apps:        [],
  selectedApp: null,
  loading:     false,
  error:       null,
}

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    clearAppError(state) {
      state.error = null;
    },
    clearSelectedApp(state) {
      state.selectedApp = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAppsThunk.fulfilled, (state, { payload }) => { state.loading = false; state.apps = payload; })
      .addCase(fetchAppsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })
      
      .addCase(fetchAppByIdThunk.pending, (state) => { state.loading = true; state.error = null; state.selectedApp = null; })
      .addCase(fetchAppByIdThunk.fulfilled, (state, { payload }) => { state.loading = false; state.selectedApp = payload; })
      .addCase(fetchAppByIdThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(connectAppThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(connectAppThunk.fulfilled, (state, { payload }) => { state.loading = false; state.apps.push(payload); })
      .addCase(connectAppThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(updateAppThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateAppThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.apps.findIndex((a) => a.id === payload.id);
        if (idx !== -1) state.apps[idx] = payload;
      })
      .addCase(updateAppThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(disconnectAppThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(disconnectAppThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.apps  = state.apps.filter((a) => a.id !== payload);
      })
      .addCase(disconnectAppThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(exportAppsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(exportAppsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportAppsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; });
  },
})

export const { clearAppError, clearSelectedApp } = appSlice.actions;
export default appSlice.reducer;
