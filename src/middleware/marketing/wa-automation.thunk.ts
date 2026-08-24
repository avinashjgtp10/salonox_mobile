import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { WA_AUTOMATION_ENDPOINTS as WA_AUTOMATION } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";

// ── Per-event automation on/off ───────────────────────────────────────────────
// A row is only written once an event has been explicitly toggled, and the
// backend reads a MISSING row as enabled — so the fetch returns a partial
// map and callers must default anything absent to `true`, not `false`.

export interface WaAutomationSetting {
  event_type: string;
  is_active:  boolean;
}

export const fetchWaAutomationSettingsThunk = createAsyncThunk<
  WaAutomationSetting[],
  string,
  { rejectValue: string }
>(
  "marketing/fetchWaAutomationSettings",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get<{ data: WaAutomationSetting[] }>(WA_AUTOMATION.SALON_SETTINGS(salonId));
      return res.data.data ?? [];
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to load automation settings");
    }
  }
);

export const updateWaAutomationSettingThunk = createAsyncThunk<
  WaAutomationSetting,
  { salonId: string; eventType: string; isActive: boolean },
  { rejectValue: string }
>(
  "marketing/updateWaAutomationSetting",
  async ({ salonId, eventType, isActive }, { rejectWithValue }) => {
    try {
      const res = await api.put<{ data: WaAutomationSetting }>(
        WA_AUTOMATION.SALON_SETTINGS(salonId),
        { event_type: eventType, is_active: isActive }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to save automation setting");
    }
  }
);
