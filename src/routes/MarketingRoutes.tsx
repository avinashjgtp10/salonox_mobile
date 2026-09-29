import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";
import PermissionGuard from "../components/guards/PermissionGuard";
import { useAppDispatch, useAppSelector } from "../hooks/useAppRedux";
import { fetchWaConfigThunk } from "../middleware/marketing/marketing.thunk";
import MarketingOnboardingPage from "../features/marketing/pages/MarketingOnboardingPage";

const MarketingDashboardPage = lazy(() => import("../features/marketing/pages/MarketingDashboardPage"));
const AnalyticsPage          = lazy(() => import("../features/marketing/pages/AnalyticsPage"));
const TemplatesListPage      = lazy(() => import("../features/marketing/pages/TemplatesListPage"));
const MessageSettingsPage    = lazy(() => import("../features/marketing/pages/MessageSettingsPage"));
const ScheduledTemplatesPage = lazy(() => import("../features/marketing/pages/ScheduledTemplatesPage"));
const CreateTemplatePage     = lazy(() => import("../features/marketing/pages/CreateTemplatePage"));
const CreateCampaignPage     = lazy(() => import("../features/marketing/pages/CreateCampaignPage"));
const CampaignHistoryPage    = lazy(() => import("../features/marketing/pages/CampaignHistoryPage"));
const InboxPage              = lazy(() => import("../features/marketing/pages/InboxPage"));
const WaConfigPage           = lazy(() => import("../features/marketing/pages/WaConfigPage"));

export const MarketingRoutes = () => {
  const dispatch = useAppDispatch();
  const { waConfig, loading, waConfigFetched } = useAppSelector((s) => s.marketing as any);

  useEffect(() => {
    // Only fetch once — dashboard page no longer needs to re-fetch
    if (!waConfigFetched) {
      dispatch(fetchWaConfigThunk());
    }
  }, [dispatch, waConfigFetched]);

  // Still fetching for the first time — show loader
  if (loading.fetchWaConfig && !waConfigFetched) {
    return <PageLoader />;
  }

  // Configured = phone_number_id exists on the config object
  const isConfigured = !!(
    waConfig?.phoneNumberId ??
    (waConfig as any)?.phone_number_id
  );

  if (!isConfigured) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Config page always accessible */}
          <Route path="config" element={<WaConfigPage />} />
          {/* Message Settings (per-event trigger wording + SMS/Email/WhatsApp
              on-off toggles — formerly the "Trigger Templates" tab inside
              Templates) doesn't need WhatsApp connected at all — SMS/Email
              work regardless — so a salon without WhatsApp shouldn't be
              locked out of it. Templates (Campaign Templates, WhatsApp-only)
              genuinely has nothing to do without WA, so it's NOT listed here
              — it falls through to onboarding like everything else. */}
          <Route path="message-settings" element={<MessageSettingsPage />} />
          {/* Everything else → onboarding */}
          <Route path="*" element={<MarketingOnboardingPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PermissionGuard permKey="view_marketing_dashboard" />}>
          <Route index element={<MarketingDashboardPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_marketing_analytics" />}>
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_templates" />}>
          <Route path="templates" element={<TemplatesListPage />} />
          <Route path="templates/create" element={<CreateTemplatePage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_templates" />}>
          <Route path="message-settings" element={<MessageSettingsPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_scheduled_templates" />}>
          <Route path="scheduled-templates" element={<ScheduledTemplatesPage />} />
        </Route>
        {/* Only Campaigns is actually gated backend-side (featureKey
            "marketing", Advance tier — see campaigns.routes.ts); the rest of
            this Marketing section stays available to every tier. */}
        <Route element={<PlanFeatureGuard featureKey="marketing" label="Marketing Campaigns" />}>
          <Route element={<PermissionGuard permKey="view_campaigns" />}>
            <Route path="campaigns/create"  element={<CreateCampaignPage />} />
            <Route path="campaigns/history" element={<CampaignHistoryPage />} />
            <Route path="campaigns" element={<Navigate to="/dashboard/marketing/campaigns/history" replace />} />
          </Route>
        </Route>
        <Route element={<PermissionGuard permKey="view_inbox" />}>
          <Route path="inbox" element={<InboxPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_whatsapp_config" />}>
          <Route path="config" element={<WaConfigPage />} />
        </Route>
        <Route path="*"                 element={<Navigate to="/dashboard/marketing" replace />} />
      </Routes>
    </Suspense>
  );
};