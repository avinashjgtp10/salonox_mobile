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
      return rejectWithValue("Failed to fetch purchase templates");
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
