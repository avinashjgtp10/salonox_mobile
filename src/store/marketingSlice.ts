import { createSlice } from "@reduxjs/toolkit";
import type { Template, Campaign, WebhookEvent, WaConfig, DashboardStats } from "../types/marketing.types";
import {
  fetchTemplatesThunk,
  createTemplateThunk,
  deleteTemplateThunk,
  syncTemplateThunk,
  fetchCampaignsThunk,
  createCampaignThunk,
  pauseCampaignThunk,
  resumeCampaignThunk,
  fetchWebhookEventsThunk,
  fetchWaConfigThunk,
  saveWaConfigThunk,
  testWaConfigThunk,
  fetchDashboardStatsThunk,
} from "../middleware/marketing/marketing.thunk";

// ── State ─────────────────────────────────────────────────────────────────────

interface MarketingState {
  templates: Template[];
  campaigns: Campaign[];
  webhookEvents: WebhookEvent[];
  waConfig: WaConfig | null;
  dashboardStats: DashboardStats | null;
  loading: {
    fetchTemplates: boolean;
    createTemplate: boolean;
    deleteTemplate: boolean;
    syncTemplate: boolean;
    fetchCampaigns: boolean;
    createCampaign: boolean;
    pauseCampaign: boolean;
    resumeCampaign: boolean;
    fetchWebhookEvents: boolean;
    fetchWaConfig: boolean;
    saveWaConfig: boolean;
    testWaConfig: boolean;
    fetchDashboardStats: boolean;
  };
  error: string | null;
}

const initialState: MarketingState = {
  templates: [],
  campaigns: [],
  webhookEvents: [],
  waConfig: null,
  dashboardStats: null,
  loading: {
    fetchTemplates: false,
    createTemplate: false,
    deleteTemplate: false,
    syncTemplate: false,
    fetchCampaigns: false,
    createCampaign: false,
    pauseCampaign: false,
    resumeCampaign: false,
    fetchWebhookEvents: false,
    fetchWaConfig: false,
    saveWaConfig: false,
    testWaConfig: false,
    fetchDashboardStats: false,
  },
  error: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const marketingSlice = createSlice({
  name: "marketing",
  initialState,
  reducers: {
    clearMarketingError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchTemplates ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchTemplatesThunk.pending, (state) => {
        state.loading.fetchTemplates = true;
        state.error = null;
      })
      .addCase(fetchTemplatesThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchTemplates = false;
        state.templates = payload;
      })
      .addCase(fetchTemplatesThunk.rejected, (state, { payload }) => {
        state.loading.fetchTemplates = false;
        state.error = payload ?? "Failed to fetch templates";
      });

    // ── createTemplate ─────────────────────────────────────────────────────────
    builder
      .addCase(createTemplateThunk.pending, (state) => {
        state.loading.createTemplate = true;
        state.error = null;
      })
      .addCase(createTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.createTemplate = false;
        state.templates.push(payload);
      })
      .addCase(createTemplateThunk.rejected, (state, { payload }) => {
        state.loading.createTemplate = false;
        state.error = payload ?? "Failed to create template";
      });

    // ── deleteTemplate ─────────────────────────────────────────────────────────
    builder
      .addCase(deleteTemplateThunk.pending, (state) => {
        state.loading.deleteTemplate = true;
        state.error = null;
      })
      .addCase(deleteTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.deleteTemplate = false;
        state.templates = state.templates.filter((t) => t.id !== payload);
      })
      .addCase(deleteTemplateThunk.rejected, (state, { payload }) => {
        state.loading.deleteTemplate = false;
        state.error = payload ?? "Failed to delete template";
      });

    // ── syncTemplate ───────────────────────────────────────────────────────────
    builder
      .addCase(syncTemplateThunk.pending, (state) => {
        state.loading.syncTemplate = true;
        state.error = null;
      })
      .addCase(syncTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.syncTemplate = false;
        const idx = state.templates.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.templates[idx] = payload;
      })
      .addCase(syncTemplateThunk.rejected, (state, { payload }) => {
        state.loading.syncTemplate = false;
        state.error = payload ?? "Failed to sync template";
      });

    // ── fetchCampaigns ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchCampaignsThunk.pending, (state) => {
        state.loading.fetchCampaigns = true;
        state.error = null;
      })
      .addCase(fetchCampaignsThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchCampaigns = false;
        state.campaigns = payload;
      })
      .addCase(fetchCampaignsThunk.rejected, (state, { payload }) => {
        state.loading.fetchCampaigns = false;
        state.error = payload ?? "Failed to fetch campaigns";
      });

    // ── createCampaign ─────────────────────────────────────────────────────────
    builder
      .addCase(createCampaignThunk.pending, (state) => {
        state.loading.createCampaign = true;
        state.error = null;
      })
      .addCase(createCampaignThunk.fulfilled, (state, { payload }) => {
        state.loading.createCampaign = false;
        state.campaigns.push(payload);
      })
      .addCase(createCampaignThunk.rejected, (state, { payload }) => {
        state.loading.createCampaign = false;
        state.error = payload ?? "Failed to create campaign";
      });

    // ── pauseCampaign ──────────────────────────────────────────────────────────
    builder
      .addCase(pauseCampaignThunk.pending, (state) => {
        state.loading.pauseCampaign = true;
        state.error = null;
      })
      .addCase(pauseCampaignThunk.fulfilled, (state, { payload }) => {
        state.loading.pauseCampaign = false;
        const idx = state.campaigns.findIndex((c) => c.id === payload);
        if (idx !== -1) state.campaigns[idx].status = "PAUSED";
      })
      .addCase(pauseCampaignThunk.rejected, (state, { payload }) => {
        state.loading.pauseCampaign = false;
        state.error = payload ?? "Failed to pause campaign";
      });

    // ── resumeCampaign ─────────────────────────────────────────────────────────
    builder
      .addCase(resumeCampaignThunk.pending, (state) => {
        state.loading.resumeCampaign = true;
        state.error = null;
      })
      .addCase(resumeCampaignThunk.fulfilled, (state, { payload }) => {
        state.loading.resumeCampaign = false;
        const idx = state.campaigns.findIndex((c) => c.id === payload);
        if (idx !== -1) state.campaigns[idx].status = "RUNNING";
      })
      .addCase(resumeCampaignThunk.rejected, (state, { payload }) => {
        state.loading.resumeCampaign = false;
        state.error = payload ?? "Failed to resume campaign";
      });

    // ── fetchWebhookEvents ─────────────────────────────────────────────────────
    builder
      .addCase(fetchWebhookEventsThunk.pending, (state) => {
        state.loading.fetchWebhookEvents = true;
        state.error = null;
      })
      .addCase(fetchWebhookEventsThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchWebhookEvents = false;
        state.webhookEvents = payload;
      })
      .addCase(fetchWebhookEventsThunk.rejected, (state, { payload }) => {
        state.loading.fetchWebhookEvents = false;
        state.error = payload ?? "Failed to fetch webhook events";
      });

    // ── fetchWaConfig ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchWaConfigThunk.pending, (state) => {
        state.loading.fetchWaConfig = true;
        state.error = null;
      })
      .addCase(fetchWaConfigThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchWaConfig = false;
        state.waConfig = payload;
      })
      .addCase(fetchWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.fetchWaConfig = false;
        state.error = payload ?? "Failed to fetch WhatsApp config";
      });

    // ── saveWaConfig ───────────────────────────────────────────────────────────
    builder
      .addCase(saveWaConfigThunk.pending, (state) => {
        state.loading.saveWaConfig = true;
        state.error = null;
      })
      .addCase(saveWaConfigThunk.fulfilled, (state, { payload }) => {
        state.loading.saveWaConfig = false;
        state.waConfig = payload;
      })
      .addCase(saveWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.saveWaConfig = false;
        state.error = payload ?? "Failed to save WhatsApp config";
      });

    // ── testWaConfig ───────────────────────────────────────────────────────────
    builder
      .addCase(testWaConfigThunk.pending, (state) => {
        state.loading.testWaConfig = true;
        state.error = null;
      })
      .addCase(testWaConfigThunk.fulfilled, (state) => {
        state.loading.testWaConfig = false;
      })
      .addCase(testWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.testWaConfig = false;
        state.error = payload ?? "Connection failed";
      });

    // ── fetchDashboardStats ────────────────────────────────────────────────────
    builder
      .addCase(fetchDashboardStatsThunk.pending, (state) => {
        state.loading.fetchDashboardStats = true;
        state.error = null;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchDashboardStats = false;
        state.dashboardStats = payload;
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, { payload }) => {
        state.loading.fetchDashboardStats = false;
        state.error = payload ?? "Failed to fetch dashboard stats";
      });
  },
});

export const { clearMarketingError } = marketingSlice.actions;
export default marketingSlice.reducer;
