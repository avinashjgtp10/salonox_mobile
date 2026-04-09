import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { MARKETING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  Template,
  Campaign,
  WebhookEvent,
  WaConfig,
  DashboardStats,
  CreateCampaignPayload,
  SaveWaConfigPayload,
  TemplatesListResponse,
  CampaignsListResponse,
  WebhookEventsResponse,
  WaConfigResponse,
  DashboardStatsResponse,
  TemplateResponse,
  CampaignResponse,
} from "../../types/marketing.types";

// ── Templates ─────────────────────────────────────────────────────────────────

export const fetchTemplatesThunk = createAsyncThunk<
  Template[],
  void,
  { rejectValue: string }
>("marketing/fetchTemplates", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<TemplatesListResponse>(MARKETING.TEMPLATES);
    return res.data.data ?? [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch templates");
  }
});

export const createTemplateThunk = createAsyncThunk<
  Template,
  FormData,
  { rejectValue: string }
>("marketing/createTemplate", async (formData, { rejectWithValue }) => {
  try {
    const res = await api.post<TemplateResponse>(MARKETING.TEMPLATES, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create template");
  }
});

export const deleteTemplateThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("marketing/deleteTemplate", async (id, { rejectWithValue }) => {
  try {
    await api.delete(MARKETING.TEMPLATE_BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete template");
  }
});

export const syncTemplateThunk = createAsyncThunk<
  Template,
  string | number,
  { rejectValue: string }
>("marketing/syncTemplate", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<TemplateResponse>(MARKETING.TEMPLATE_SYNC(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to sync template");
  }
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

export const fetchCampaignsThunk = createAsyncThunk<
  Campaign[],
  void,
  { rejectValue: string }
>("marketing/fetchCampaigns", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<CampaignsListResponse>(MARKETING.CAMPAIGNS);
    return res.data.data ?? [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch campaigns");
  }
});

export const createCampaignThunk = createAsyncThunk<
  Campaign,
  CreateCampaignPayload,
  { rejectValue: string }
>("marketing/createCampaign", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<CampaignResponse>(MARKETING.CAMPAIGNS, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create campaign");
  }
});

export const pauseCampaignThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("marketing/pauseCampaign", async (id, { rejectWithValue }) => {
  try {
    await api.post(MARKETING.CAMPAIGN_PAUSE(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to pause campaign");
  }
});

export const resumeCampaignThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("marketing/resumeCampaign", async (id, { rejectWithValue }) => {
  try {
    await api.post(MARKETING.CAMPAIGN_RESUME(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to resume campaign");
  }
});

// ── Webhook Events ────────────────────────────────────────────────────────────

export const fetchWebhookEventsThunk = createAsyncThunk<
  WebhookEvent[],
  void,
  { rejectValue: string }
>("marketing/fetchWebhookEvents", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<WebhookEventsResponse>(MARKETING.WEBHOOK_EVENTS);
    return res.data.data ?? [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch webhook events");
  }
});

// ── WhatsApp Config ───────────────────────────────────────────────────────────

export const fetchWaConfigThunk = createAsyncThunk<
  WaConfig,
  void,
  { rejectValue: string }
>("marketing/fetchWaConfig", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<WaConfigResponse>(MARKETING.WA_CONFIG);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch WhatsApp config");
  }
});

export const saveWaConfigThunk = createAsyncThunk<
  WaConfig,
  SaveWaConfigPayload,
  { rejectValue: string }
>("marketing/saveWaConfig", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<WaConfigResponse>(MARKETING.WA_CONFIG, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to save WhatsApp config");
  }
});

export const testWaConfigThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("marketing/testWaConfig", async (_, { rejectWithValue }) => {
  try {
    await api.post(MARKETING.WA_CONFIG_TEST);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Connection failed. Check your credentials.");
  }
});

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export const fetchDashboardStatsThunk = createAsyncThunk<
  DashboardStats,
  void,
  { rejectValue: string }
>("marketing/fetchDashboardStats", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<DashboardStatsResponse>(MARKETING.DASHBOARD_STATS);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch dashboard stats");
  }
});
