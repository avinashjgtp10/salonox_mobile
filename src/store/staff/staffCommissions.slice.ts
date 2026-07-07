import { createSlice } from "@reduxjs/toolkit";

import {
  fetchCommissionHistoryThunk,
  fetchCommissionSettingsThunk,
  fetchCommissionSlabsThunk,
  updateCommissionSettingsThunk,
  updateCommissionSlabsThunk,
} from "@/middleware/staff/staffCommissions.thunk";
import type { RootState } from "@/store";
import type { CommissionHistoryEntry, CommissionSettings, CommissionSlab } from "@/types/staffCommissions";

type StaffCommissionsState = {
  commissionByStaffId: Record<string, CommissionSettings | null>;
  historyByStaffId: Record<string, CommissionHistoryEntry[]>;
  historyErrorByStaffId: Record<string, string | null>;
  historyLoadedStaffIds: string[];
  historyLoadingStaffIds: string[];
  settingsErrorByStaffId: Record<string, string | null>;
  settingsLoadedStaffIds: string[];
  settingsLoadingStaffIds: string[];
  settingsSaveErrorByStaffId: Record<string, string | null>;
  settingsSavingStaffIds: string[];
  slabsByStaffId: Record<string, CommissionSlab[]>;
  slabsErrorByStaffId: Record<string, string | null>;
  slabsLoadedStaffIds: string[];
  slabsLoadingStaffIds: string[];
  slabsSaveErrorByStaffId: Record<string, string | null>;
  slabsSavingStaffIds: string[];
};

const initialState: StaffCommissionsState = {
  commissionByStaffId: {},
  historyByStaffId: {},
  historyErrorByStaffId: {},
  historyLoadedStaffIds: [],
  historyLoadingStaffIds: [],
  settingsErrorByStaffId: {},
  settingsLoadedStaffIds: [],
  settingsLoadingStaffIds: [],
  settingsSaveErrorByStaffId: {},
  settingsSavingStaffIds: [],
  slabsByStaffId: {},
  slabsErrorByStaffId: {},
  slabsLoadedStaffIds: [],
  slabsLoadingStaffIds: [],
  slabsSaveErrorByStaffId: {},
  slabsSavingStaffIds: [],
};

const staffCommissionsSlice = createSlice({
  name: "staffCommissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommissionSettingsThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.settingsErrorByStaffId[staffId] = null;
        state.settingsLoadingStaffIds = [...state.settingsLoadingStaffIds, staffId];
      })
      .addCase(fetchCommissionSettingsThunk.fulfilled, (state, action) => {
        const { commission, staffId } = action.payload;

        state.commissionByStaffId[staffId] = commission;
        state.settingsLoadedStaffIds = state.settingsLoadedStaffIds.includes(staffId)
          ? state.settingsLoadedStaffIds
          : [...state.settingsLoadedStaffIds, staffId];
        state.settingsLoadingStaffIds = state.settingsLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionSettingsThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.settingsErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load commission settings.";
        state.settingsLoadingStaffIds = state.settingsLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateCommissionSettingsThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.settingsSaveErrorByStaffId[staffId] = null;
        state.settingsSavingStaffIds = [...state.settingsSavingStaffIds, staffId];
      })
      .addCase(updateCommissionSettingsThunk.fulfilled, (state, action) => {
        const { commission, staffId } = action.payload;

        state.commissionByStaffId[staffId] = commission;
        state.settingsLoadedStaffIds = state.settingsLoadedStaffIds.includes(staffId)
          ? state.settingsLoadedStaffIds
          : [...state.settingsLoadedStaffIds, staffId];
        state.settingsSavingStaffIds = state.settingsSavingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateCommissionSettingsThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.settingsSaveErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to update commission settings.";
        state.settingsSavingStaffIds = state.settingsSavingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionSlabsThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.slabsErrorByStaffId[staffId] = null;
        state.slabsLoadingStaffIds = [...state.slabsLoadingStaffIds, staffId];
      })
      .addCase(fetchCommissionSlabsThunk.fulfilled, (state, action) => {
        const { slabs, staffId } = action.payload;

        state.slabsByStaffId[staffId] = slabs;
        state.slabsLoadedStaffIds = state.slabsLoadedStaffIds.includes(staffId)
          ? state.slabsLoadedStaffIds
          : [...state.slabsLoadedStaffIds, staffId];
        state.slabsLoadingStaffIds = state.slabsLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionSlabsThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.slabsErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load commission slabs.";
        state.slabsLoadingStaffIds = state.slabsLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateCommissionSlabsThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.slabsSaveErrorByStaffId[staffId] = null;
        state.slabsSavingStaffIds = [...state.slabsSavingStaffIds, staffId];
      })
      .addCase(updateCommissionSlabsThunk.fulfilled, (state, action) => {
        const { slabs, staffId } = action.payload;

        state.slabsByStaffId[staffId] = slabs;
        state.slabsLoadedStaffIds = state.slabsLoadedStaffIds.includes(staffId)
          ? state.slabsLoadedStaffIds
          : [...state.slabsLoadedStaffIds, staffId];
        state.slabsSavingStaffIds = state.slabsSavingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(updateCommissionSlabsThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.slabsSaveErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to update commission slabs.";
        state.slabsSavingStaffIds = state.slabsSavingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionHistoryThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.historyErrorByStaffId[staffId] = null;
        state.historyLoadingStaffIds = [...state.historyLoadingStaffIds, staffId];
      })
      .addCase(fetchCommissionHistoryThunk.fulfilled, (state, action) => {
        const { history, staffId } = action.payload;

        state.historyByStaffId[staffId] = history;
        state.historyLoadedStaffIds = state.historyLoadedStaffIds.includes(staffId)
          ? state.historyLoadedStaffIds
          : [...state.historyLoadedStaffIds, staffId];
        state.historyLoadingStaffIds = state.historyLoadingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(fetchCommissionHistoryThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.historyErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load commission history.";
        state.historyLoadingStaffIds = state.historyLoadingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectCommissionSettings = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.commissionByStaffId[staffId] ?? null : null;
export const selectCommissionSettingsLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.settingsLoadedStaffIds.includes(staffId) : false;
export const selectCommissionSettingsLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.settingsLoadingStaffIds.includes(staffId) : false;
export const selectCommissionSettingsError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.settingsErrorByStaffId[staffId] ?? null : null;
export const selectCommissionSettingsSaving = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.settingsSavingStaffIds.includes(staffId) : false;
export const selectCommissionSettingsSaveError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.settingsSaveErrorByStaffId[staffId] ?? null : null;

export const selectCommissionSlabs = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsByStaffId[staffId] ?? [] : [];
export const selectCommissionSlabsLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsLoadedStaffIds.includes(staffId) : false;
export const selectCommissionSlabsLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsLoadingStaffIds.includes(staffId) : false;
export const selectCommissionSlabsError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsErrorByStaffId[staffId] ?? null : null;
export const selectCommissionSlabsSaving = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsSavingStaffIds.includes(staffId) : false;
export const selectCommissionSlabsSaveError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.slabsSaveErrorByStaffId[staffId] ?? null : null;

export const selectCommissionHistory = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyByStaffId[staffId] ?? [] : [];
export const selectCommissionHistoryLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyLoadedStaffIds.includes(staffId) : false;
export const selectCommissionHistoryLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyLoadingStaffIds.includes(staffId) : false;
export const selectCommissionHistoryError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staffCommissions.historyErrorByStaffId[staffId] ?? null : null;

export default staffCommissionsSlice.reducer;
