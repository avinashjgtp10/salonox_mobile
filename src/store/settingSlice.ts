import { createSlice } from "@reduxjs/toolkit";
import type { Setting } from "../types/setting.types";
import {
  fetchSettingsThunk,
  fetchSettingByIdThunk,
  createSettingThunk,
  updateSettingThunk,
  deleteSettingThunk,
  exportSettingsThunk,
} from "../middleware/setting/setting.thunk";

export interface SettingState {
  settings:        Setting[];
  selectedSetting: Setting | null;
  loading:         boolean;
  error:           string | null;
}

const initialState: SettingState = {
  settings:        [],
  selectedSetting: null,
  loading:         false,
  error:           null,
}

const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {
    clearSettingError(state) {
      state.error = null;
    },
    clearSelectedSetting(state) {
      state.selectedSetting = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettingsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSettingsThunk.fulfilled, (state, { payload }) => { state.loading = false; state.settings = payload; })
      .addCase(fetchSettingsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })
      
      .addCase(fetchSettingByIdThunk.pending, (state) => { state.loading = true; state.error = null; state.selectedSetting = null; })
      .addCase(fetchSettingByIdThunk.fulfilled, (state, { payload }) => { state.loading = false; state.selectedSetting = payload; })
      .addCase(fetchSettingByIdThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(createSettingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createSettingThunk.fulfilled, (state, { payload }) => { state.loading = false; state.settings.push(payload); })
      .addCase(createSettingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(updateSettingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateSettingThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.settings.findIndex((s) => s.id === payload.id);
        if (idx !== -1) state.settings[idx] = payload;
      })
      .addCase(updateSettingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(deleteSettingThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteSettingThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.settings  = state.settings.filter((s) => s.id !== payload);
      })
      .addCase(deleteSettingThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; })

      .addCase(exportSettingsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(exportSettingsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportSettingsThunk.rejected, (state, { payload }) => { state.loading = false; state.error = payload ?? "Failed"; });
  },
})

export const { clearSettingError, clearSelectedSetting } = settingSlice.actions;
export default settingSlice.reducer;
