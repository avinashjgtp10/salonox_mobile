import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { WA_AUTOMATION_ENDPOINTS as WA_AUTOMATION } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  PurchaseTemplate,
  PurchaseTemplatesListResponse,
  PurchaseTemplateResponse,
} from "../../types/marketing.types";

export const fetchPurchaseTemplatesThunk = createAsyncThunk<PurchaseTemplate[], string, { rejectValue: string }>(
  "marketing/fetchPurchaseTemplates",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get<PurchaseTemplatesListResponse>(WA_AUTOMATION.PURCHASE_TEMPLATES(salonId));
      return res.data.data ?? [];
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch trigger templates");
    }
  }
);

export const updatePurchaseTemplateThunk = createAsyncThunk<
  PurchaseTemplate,
  { salonId: string; eventType: string; bodyText: string },
  { rejectValue: string }
>(
  "marketing/updatePurchaseTemplate",
  async ({ salonId, eventType, bodyText }, { rejectWithValue }) => {
    try {
      const res = await api.patch<PurchaseTemplateResponse>(
        WA_AUTOMATION.PURCHASE_TEMPLATE_UPDATE(salonId, eventType),
        { body_text: bodyText }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to save template wording");
    }
  }
);

export const submitPurchaseTemplateThunk = createAsyncThunk<
  PurchaseTemplate,
  { salonId: string; eventType: string },
  { rejectValue: string }
>(
  "marketing/submitPurchaseTemplate",
  async ({ salonId, eventType }, { rejectWithValue }) => {
    try {
      const res = await api.post<PurchaseTemplateResponse>(WA_AUTOMATION.PURCHASE_TEMPLATE_SUBMIT(salonId, eventType));
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to submit template for approval");
    }
  }
);

export const resetPurchaseTemplateThunk = createAsyncThunk<
  PurchaseTemplate,
  { salonId: string; eventType: string },
  { rejectValue: string }
>(
  "marketing/resetPurchaseTemplate",
  async ({ salonId, eventType }, { rejectWithValue }) => {
    try {
      const res = await api.post<PurchaseTemplateResponse>(WA_AUTOMATION.PURCHASE_TEMPLATE_RESET(salonId, eventType));
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to reset template");
    }
  }
);

export const syncPurchaseTemplateThunk = createAsyncThunk<
  PurchaseTemplate,
  { salonId: string; eventType: string },
  { rejectValue: string }
>(
  "marketing/syncPurchaseTemplate",
  async ({ salonId, eventType }, { rejectWithValue }) => {
    try {
      const res = await api.post<PurchaseTemplateResponse>(WA_AUTOMATION.PURCHASE_TEMPLATE_SYNC(salonId, eventType));
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to sync template status");
    }
  }
);

export const sendPurchaseTemplateTestThunk = createAsyncThunk<
  { sent: boolean; status: string; failure_reason: string | null },
  { salonId: string; eventType: string; phone: string },
  { rejectValue: string }
>(
  "marketing/sendPurchaseTemplateTest",
  async ({ salonId, eventType, phone }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: { sent: boolean; status: string; failure_reason: string | null } }>(
        WA_AUTOMATION.PURCHASE_TEMPLATE_TEST_SEND(salonId, eventType), { phone }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to send test message");
    }
  }
);

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
