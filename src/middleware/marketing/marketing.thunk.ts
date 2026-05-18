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
  TemplateResponse,
  CampaignResponse,
} from "../../types/marketing.types";

// ── Normalizers (snake_case DB → camelCase UI aliases) ────────────────────────
// These add convenience alias fields so existing UI code keeps working
// while types are aligned with the real backend shape.

function normalizeTemplate(t: Template): Template {
  return {
    ...t,
    bodyText:        t.body_text,
    rejectionReason: t.rejection_reason ?? undefined,
    createdAt:       t.created_at,
  };
}

function normalizeCampaign(c: Campaign): Campaign {
  return {
    ...c,
    templateId:    c.template_id,
    batchSize:     c.batch_size,
    totalContacts: c.total_contacts,
    sent:          c.sent_count,
    delivered:     c.delivered_count,
    read:          c.read_count,
    failed:        c.failed_count,
    // Map backend SENDING → RUNNING so existing UI status checks still work
    status: c.status === "SENDING" ? "RUNNING" : c.status,
  };
}

function normalizeWaConfig(cfg: WaConfig): WaConfig {
  return {
    ...cfg,
    phoneNumberId:      cfg.phone_number_id,
    wabaId:             cfg.waba_id,
    webhookVerifyToken: cfg.webhook_verify_token,
    displayPhone:       cfg.display_phone,
    isVerified:         cfg.is_verified,
    dailyLimit:         cfg.daily_limit,
    qualityRating:      cfg.quality_rating,
  };
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const fetchTemplatesThunk = createAsyncThunk<
  Template[],
  void,
  { rejectValue: string }
>("marketing/fetchTemplates", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<TemplatesListResponse>(MARKETING.TEMPLATES);
    return (res.data.data ?? []).map(normalizeTemplate);
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
    const keyMap: Record<string, string> = {
      headerType: "header_type",
      headerText: "header_text",
      bodyText:   "body_text",
      footerText: "footer_text",
    };

    // Check if there is a file — if yes send FormData, else send JSON
    const hasFile = formData.get("headerFile") instanceof File;

    if (hasFile) {
      // Send as multipart/form-data so multer can parse the file on backend
      const snake = new FormData();
      formData.forEach((value, key) => {
        const snakeKey = keyMap[key] ?? key;
        snake.append(snakeKey, value);
      });
      if (!snake.get("header_type")) snake.append("header_type", "none");
      const res = await api.post<TemplateResponse>(MARKETING.TEMPLATES, snake, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return normalizeTemplate(res.data.data);
    } else {
      // No file — send as JSON (simpler, backend handles without multer)
      const body: Record<string, any> = {};
      formData.forEach((value, key) => {
        const snakeKey = keyMap[key] ?? key;
        if (snakeKey === "buttons") {
          try { body[snakeKey] = JSON.parse(value as string) } catch { body[snakeKey] = [] }
        } else {
          body[snakeKey] = value;
        }
      });
      if (!body.header_type) body.header_type = "none";
      const res = await api.post<TemplateResponse>(MARKETING.TEMPLATES, body);
      return normalizeTemplate(res.data.data);
    }
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
    return normalizeTemplate(res.data.data);
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
    return (res.data.data ?? []).map(normalizeCampaign);
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
    // FIX: CreateCampaignPage passes { templateId, batchSize } (camelCase).
    // Remap to snake_case before sending.
    const body: CreateCampaignPayload = {
      name:        payload.name,
      template_id: (payload as any).templateId ?? payload.template_id,
      batch_size:  (payload as any).batchSize  ?? payload.batch_size,
      contacts:    payload.contacts,
    };
    const res = await api.post<CampaignResponse>(MARKETING.CAMPAIGNS, body);
    return normalizeCampaign(res.data.data);
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
    // FIX: config controller returns raw object (not wrapped in { data: })
    // so we handle both shapes gracefully.
    const res = await api.get<WaConfigResponse | WaConfig>(MARKETING.WA_CONFIG);
    const payload = (res.data as WaConfigResponse).data ?? (res.data as WaConfig);
    return normalizeWaConfig(payload);
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
    // Remap camelCase from WaConfigPage form → snake_case for backend
    // Also skip access_token if empty (user wants to keep existing token)
    const p = payload as any
    const body: Record<string, any> = {
      phone_number_id:      p.phoneNumberId      ?? p.phone_number_id,
      waba_id:              p.wabaId             ?? p.waba_id,
      webhook_verify_token: p.webhookVerifyToken ?? p.webhook_verify_token,
    }
    const appId = p.appId ?? p.app_id
    if (appId && appId.trim().length > 0) body.app_id = appId

    // Send app_secret for auto webhook registration
    const appSecret = p.appSecret ?? (p as any).app_secret
    if (appSecret && appSecret.trim().length > 0) body.app_secret = appSecret

    const token = p.accessToken ?? p.access_token
    if (token && token.trim().length > 0) body.access_token = token
    const res = await api.put<WaConfigResponse | WaConfig>(MARKETING.WA_CONFIG, body);
    const data = (res.data as WaConfigResponse).data ?? (res.data as WaConfig);
    return normalizeWaConfig(data);
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

export const fetchCampaignContactsThunk = createAsyncThunk<
  any[],
  string | number,
  { rejectValue: string }
>("marketing/fetchCampaignContacts", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(MARKETING.CAMPAIGN_CONTACTS(id));
    return res.data.data ?? [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch campaign contacts");
  }
});

export const fetchDashboardStatsThunk = createAsyncThunk<
  DashboardStats,
  void,
  { rejectValue: string }
>("marketing/fetchDashboardStats", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<any>(MARKETING.DASHBOARD_STATS);
    // Backend returns data directly (no { data: } wrapper)
    // Also normalize totalMessagesSent -> totalSent
    const raw = res.data?.data ?? res.data;
    return {
      totalSent:       raw.totalMessagesSent ?? raw.totalSent       ?? 0,
      totalDelivered:  raw.totalDelivered    ?? 0,
      totalRead:       raw.totalRead         ?? 0,
      totalFailed:     raw.totalFailed       ?? 0,
      totalBlocked:    raw.totalBlocked      ?? 0,
      totalContacts:   raw.totalContacts     ?? 0,
      totalCampaigns:  raw.totalCampaigns    ?? 0,
      activeCampaigns: raw.activeCampaigns   ?? 0,
      dailyVolume:     raw.dailyVolume       ?? [],
    } as DashboardStats;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch dashboard stats");
  }
});