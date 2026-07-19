import { createSlice } from "@reduxjs/toolkit";
import type { Template, Campaign, WebhookEvent, WaConfig, DashboardStats, PurchaseTemplate } from "../types/marketing.types";
import {
  fetchTemplatesThunk,
  createTemplateThunk,
  deleteTemplateThunk,
  syncTemplateThunk,
  toggleTemplateFavoriteThunk,
  fetchCampaignsThunk,
  createCampaignThunk,
  resendCampaignThunk,
  pauseCampaignThunk,
  resumeCampaignThunk,
  fetchWebhookEventsThunk,
  fetchWaConfigThunk,
  saveWaConfigThunk,
  deleteWaConfigThunk,
  setAiReceptionistEnabledThunk,
  testWaConfigThunk,
  syncWaLimitsThunk,
  fetchDashboardStatsThunk,
} from "../middleware/marketing/marketing.thunk";
import {
  fetchPurchaseTemplatesThunk,
  updatePurchaseTemplateThunk,
  submitPurchaseTemplateThunk,
  resetPurchaseTemplateThunk,
  syncPurchaseTemplateThunk,
} from "../middleware/marketing/wa-automation.thunk";
import { fetchAnalytics } from "../middleware/marketing/analytics.thunk";
import type { WAAnalyticsStats } from "../middleware/marketing/analytics.thunk";

interface MarketingState {
  templates:      Template[];
  campaigns:      Campaign[];
  webhookEvents:  WebhookEvent[];
  webhookEventsTotal:        number;
  webhookEventsStatusCounts: Record<string, number>;
  waConfig:       WaConfig | null;
  dashboardStats: DashboardStats | null;
  analyticsData:  WAAnalyticsStats | null;
  waConfigFetched: boolean;
  purchaseTemplates: PurchaseTemplate[];
  loading: {
    fetchTemplates:        boolean;
    createTemplate:        boolean;
    deleteTemplate:        boolean;
    syncTemplate:          boolean;
    toggleFavorite:        boolean;
    fetchCampaigns:        boolean;
    createCampaign:        boolean;
    resendCampaign:        boolean;
    pauseCampaign:         boolean;
    resumeCampaign:        boolean;
    fetchWebhookEvents:    boolean;
    fetchWaConfig:         boolean;
    saveWaConfig:          boolean;
    deleteWaConfig:        boolean;
    setAiReceptionistEnabled: boolean;
    testWaConfig:          boolean;
    syncWaLimits:          boolean;
    fetchDashboardStats:   boolean;
    fetchAnalytics:        boolean;
    fetchPurchaseTemplates:  boolean;
    updatePurchaseTemplate:  boolean;
    submitPurchaseTemplate:  boolean;
    syncPurchaseTemplate:    boolean;
  };
  error: string | null;
}

const initialState: MarketingState = {
  templates:      [],
  campaigns:      [],
  webhookEvents:  [],
  webhookEventsTotal:        0,
  webhookEventsStatusCounts: {},
  waConfig:       null,
  dashboardStats: null,
  analyticsData:  null,
  waConfigFetched: false,
  purchaseTemplates: [],
  loading: {
    fetchTemplates:        false,
    createTemplate:        false,
    deleteTemplate:        false,
    syncTemplate:          false,
    toggleFavorite:        false,
    fetchCampaigns:        false,
    createCampaign:        false,
    resendCampaign:        false,
    pauseCampaign:         false,
    resumeCampaign:        false,
    fetchWebhookEvents:    false,
    fetchWaConfig:         false,
    saveWaConfig:          false,
    deleteWaConfig:        false,
    setAiReceptionistEnabled: false,
    testWaConfig:          false,
    syncWaLimits:          false,
    fetchDashboardStats:   false,
    fetchAnalytics:        false,
    fetchPurchaseTemplates:  false,
    updatePurchaseTemplate:  false,
    submitPurchaseTemplate:  false,
    syncPurchaseTemplate:    false,
  },
  error: null,
};

const marketingSlice = createSlice({
  name: "marketing",
  initialState,
  reducers: {
    clearMarketingError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {

    // ── fetchTemplates ────────────────────────────────────────────────────────
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

    // ── createTemplate ────────────────────────────────────────────────────────
    builder
      .addCase(createTemplateThunk.pending, (state) => {
        state.loading.createTemplate = true;
        state.error = null;
      })
      .addCase(createTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.createTemplate = false;
        state.templates.unshift(payload);
      })
      .addCase(createTemplateThunk.rejected, (state, { payload }) => {
        state.loading.createTemplate = false;
        state.error = payload ?? "Failed to create template";
      });

    // ── deleteTemplate ────────────────────────────────────────────────────────
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

    // ── syncTemplate ──────────────────────────────────────────────────────────
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

    // ── toggleTemplateFavorite ────────────────────────────────────────────────
    builder
      .addCase(toggleTemplateFavoriteThunk.pending, (state) => {
        state.loading.toggleFavorite = true;
      })
      .addCase(toggleTemplateFavoriteThunk.fulfilled, (state, { payload }) => {
        state.loading.toggleFavorite = false;
        state.templates = state.templates
          .map(t => t.id === payload.id ? payload : t)
          .sort((a, b) => {
            const af = (a as any).is_favorite ? 1 : 0;
            const bf = (b as any).is_favorite ? 1 : 0;
            return bf - af;
          });
      })
      .addCase(toggleTemplateFavoriteThunk.rejected, (state, { payload }) => {
        state.loading.toggleFavorite = false;
        state.error = payload ?? "Failed to update favorite";
      });

    // ── fetchCampaigns ────────────────────────────────────────────────────────
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

    // ── createCampaign ────────────────────────────────────────────────────────
    builder
      .addCase(createCampaignThunk.pending, (state) => {
        state.loading.createCampaign = true;
        state.error = null;
      })
      .addCase(createCampaignThunk.fulfilled, (state, { payload }) => {
        state.loading.createCampaign = false;
        state.campaigns.unshift(payload);
      })
      .addCase(createCampaignThunk.rejected, (state, { payload }) => {
        state.loading.createCampaign = false;
        state.error = payload ?? "Failed to create campaign";
      });

    // ── resendCampaign ────────────────────────────────────────────────────────
    builder
      .addCase(resendCampaignThunk.pending, (state) => {
        state.loading.resendCampaign = true;
        state.error = null;
      })
      .addCase(resendCampaignThunk.fulfilled, (state, { payload }) => {
        state.loading.resendCampaign = false;
        state.campaigns.unshift(payload);
      })
      .addCase(resendCampaignThunk.rejected, (state, { payload }) => {
        state.loading.resendCampaign = false;
        state.error = payload ?? "Failed to resend campaign";
      });

    // ── pauseCampaign ─────────────────────────────────────────────────────────
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

    // ── resumeCampaign ────────────────────────────────────────────────────────
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

    // ── fetchWebhookEvents ────────────────────────────────────────────────────
    builder
      .addCase(fetchWebhookEventsThunk.pending, (state) => {
        state.loading.fetchWebhookEvents = true;
        state.error = null;
      })
      .addCase(fetchWebhookEventsThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchWebhookEvents = false;
        state.webhookEvents = payload.events;
        state.webhookEventsTotal = payload.total;
        state.webhookEventsStatusCounts = payload.statusCounts;
      })
      .addCase(fetchWebhookEventsThunk.rejected, (state, { payload }) => {
        state.loading.fetchWebhookEvents = false;
        state.error = payload ?? "Failed to fetch webhook events";
      });

    // ── fetchWaConfig ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchWaConfigThunk.pending, (state) => {
        state.loading.fetchWaConfig = true;
        state.error = null;
      })
      .addCase(fetchWaConfigThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchWaConfig = false;
        state.waConfigFetched = true;
        state.waConfig = payload;
      })
      .addCase(fetchWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.fetchWaConfig = false;
        state.waConfigFetched = true;
        state.error = payload ?? "Failed to fetch WhatsApp config";
      });

    // ── saveWaConfig ──────────────────────────────────────────────────────────
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

    // ── deleteWaConfig ────────────────────────────────────────────────────────
    builder
      .addCase(deleteWaConfigThunk.pending, (state) => {
        state.loading.deleteWaConfig = true;
        state.error = null;
      })
      .addCase(deleteWaConfigThunk.fulfilled, (state) => {
        state.loading.deleteWaConfig = false;
        state.waConfig = null;
      })
      .addCase(deleteWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.deleteWaConfig = false;
        state.error = payload ?? "Failed to disconnect WhatsApp";
      });

    // ── setAiReceptionistEnabled ──────────────────────────────────────────────
    builder
      .addCase(setAiReceptionistEnabledThunk.pending, (state) => {
        state.loading.setAiReceptionistEnabled = true;
        state.error = null;
      })
      .addCase(setAiReceptionistEnabledThunk.fulfilled, (state, { payload }) => {
        state.loading.setAiReceptionistEnabled = false;
        if (state.waConfig) {
          state.waConfig.ai_receptionist_enabled = payload;
          state.waConfig.aiReceptionistEnabled = payload;
        }
      })
      .addCase(setAiReceptionistEnabledThunk.rejected, (state, { payload }) => {
        state.loading.setAiReceptionistEnabled = false;
        state.error = payload ?? "Failed to update AI receptionist setting";
      });

    // ── testWaConfig ──────────────────────────────────────────────────────────
    builder
      .addCase(testWaConfigThunk.pending, (state) => {
        state.loading.testWaConfig = true;
        state.error = null;
      })
      .addCase(testWaConfigThunk.fulfilled, (state, { payload }) => {
        state.loading.testWaConfig = false;
        state.waConfig = payload;
      })
      .addCase(testWaConfigThunk.rejected, (state, { payload }) => {
        state.loading.testWaConfig = false;
        state.error = payload ?? "Connection failed";
      });

    // ── syncWaLimits ──────────────────────────────────────────────────────────
    builder
      .addCase(syncWaLimitsThunk.pending, (state) => {
        state.loading.syncWaLimits = true;
        state.error = null;
      })
      .addCase(syncWaLimitsThunk.fulfilled, (state, { payload }) => {
        state.loading.syncWaLimits = false;
        state.waConfig = payload;
      })
      .addCase(syncWaLimitsThunk.rejected, (state, { payload }) => {
        state.loading.syncWaLimits = false;
        state.error = payload ?? "Failed to sync limits";
      });

    // ── fetchDashboardStats ───────────────────────────────────────────────────
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

    // ── fetchPurchaseTemplates ────────────────────────────────────────────────
    builder
      .addCase(fetchPurchaseTemplatesThunk.pending, (state) => {
        state.loading.fetchPurchaseTemplates = true;
        state.error = null;
      })
      .addCase(fetchPurchaseTemplatesThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchPurchaseTemplates = false;
        state.purchaseTemplates = payload;
      })
      .addCase(fetchPurchaseTemplatesThunk.rejected, (state, { payload }) => {
        state.loading.fetchPurchaseTemplates = false;
        state.error = payload ?? "Failed to fetch purchase templates";
      });

    // ── updatePurchaseTemplate ────────────────────────────────────────────────
    builder
      .addCase(updatePurchaseTemplateThunk.pending, (state) => {
        state.loading.updatePurchaseTemplate = true;
        state.error = null;
      })
      .addCase(updatePurchaseTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.updatePurchaseTemplate = false;
        const idx = state.purchaseTemplates.findIndex((t) => t.event_type === payload.event_type);
        if (idx !== -1) state.purchaseTemplates[idx] = payload;
      })
      .addCase(updatePurchaseTemplateThunk.rejected, (state, { payload }) => {
        state.loading.updatePurchaseTemplate = false;
        state.error = payload ?? "Failed to save template wording";
      });

    // ── submitPurchaseTemplate ────────────────────────────────────────────────
    builder
      .addCase(submitPurchaseTemplateThunk.pending, (state) => {
        state.loading.submitPurchaseTemplate = true;
        state.error = null;
      })
      .addCase(submitPurchaseTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.submitPurchaseTemplate = false;
        const idx = state.purchaseTemplates.findIndex((t) => t.event_type === payload.event_type);
        if (idx !== -1) state.purchaseTemplates[idx] = payload;
      })
      .addCase(submitPurchaseTemplateThunk.rejected, (state, { payload }) => {
        state.loading.submitPurchaseTemplate = false;
        state.error = payload ?? "Failed to submit template for approval";
      });

    // ── resetPurchaseTemplate ─────────────────────────────────────────────────
    builder
      .addCase(resetPurchaseTemplateThunk.fulfilled, (state, { payload }) => {
        const idx = state.purchaseTemplates.findIndex((t) => t.event_type === payload.event_type);
        if (idx !== -1) state.purchaseTemplates[idx] = payload;
      })
      .addCase(resetPurchaseTemplateThunk.rejected, (state, { payload }) => {
        state.error = payload ?? "Failed to reset template";
      });

    // ── syncPurchaseTemplate ──────────────────────────────────────────────────
    builder
      .addCase(syncPurchaseTemplateThunk.pending, (state) => {
        state.loading.syncPurchaseTemplate = true;
      })
      .addCase(syncPurchaseTemplateThunk.fulfilled, (state, { payload }) => {
        state.loading.syncPurchaseTemplate = false;
        const idx = state.purchaseTemplates.findIndex((t) => t.event_type === payload.event_type);
        if (idx !== -1) state.purchaseTemplates[idx] = payload;
      })
      .addCase(syncPurchaseTemplateThunk.rejected, (state, { payload }) => {
        state.loading.syncPurchaseTemplate = false;
        state.error = payload ?? "Failed to sync template status";
      });

    // ── fetchAnalytics ────────────────────────────────────────────────────────
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading.fetchAnalytics = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, { payload }) => {
        state.loading.fetchAnalytics = false;
        state.analyticsData = payload;
      })
      .addCase(fetchAnalytics.rejected, (state, { payload }: any) => {
        state.loading.fetchAnalytics = false;
        state.error = payload?.message ?? "Failed to fetch analytics";
      });
  },
});

export const { clearMarketingError } = marketingSlice.actions;
export default marketingSlice.reducer;