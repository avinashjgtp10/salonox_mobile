import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";
import { useAppDispatch, useAppSelector } from "../hooks/useAppRedux";
import { fetchWaConfigThunk } from "../middleware/marketing/marketing.thunk";
import MarketingOnboardingPage from "../features/marketing/pages/MarketingOnboardingPage";

const MarketingDashboardPage = lazy(() => import("../features/marketing/pages/MarketingDashboardPage"));
const AnalyticsPage          = lazy(() => import("../features/marketing/pages/AnalyticsPage"));
const TemplatesListPage      = lazy(() => import("../features/marketing/pages/TemplatesListPage"));
const ScheduledTemplatesPage = lazy(() => import("../features/marketing/pages/ScheduledTemplatesPage"));
const CreateTemplatePage     = lazy(() => import("../features/marketing/pages/CreateTemplatePage"));
const CampaignsPage          = lazy(() => import("../features/marketing/pages/CampaignsPage"));
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
          {/* Templates hosts both Campaign Templates (WhatsApp-only, still
              effectively blocked by TemplatesListPage defaulting to the
              Trigger tab below) and Trigger Templates (SMS/Email + WhatsApp
              per event) — SMS/Email don't need WhatsApp connected at all, so
              a salon without WhatsApp shouldn't be locked out of them too.
              templates/create stays gated: that's WhatsApp Campaign template
              creation specifically, genuinely nothing to do without WA. */}
          <Route path="templates" element={<TemplatesListPage />} />
          {/* Everything else → onboarding */}
          <Route path="*" element={<MarketingOnboardingPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index                    element={<MarketingDashboardPage />} />
        <Route path="analytics"         element={<AnalyticsPage />} />
        <Route path="templates"         element={<TemplatesListPage />} />
        <Route path="templates/create"  element={<CreateTemplatePage />} />
        <Route path="scheduled-templates" element={<ScheduledTemplatesPage />} />
        {/* Only Campaigns is actually gated backend-side (featureKey
            "marketing", Advance tier — see campaigns.routes.ts); the rest of
            this Marketing section stays available to every tier. */}
        <Route element={<PlanFeatureGuard featureKey="marketing" label="Marketing Campaigns" />}>
          <Route path="campaigns/create"  element={<CampaignsPage />} />
          <Route path="campaigns/history" element={<CampaignsPage />} />
        </Route>
        <Route path="inbox"             element={<InboxPage />} />
        <Route path="config"            element={<WaConfigPage />} />
        <Route path="*"                 element={<Navigate to="/dashboard/marketing" replace />} />
      </Routes>
    </Suspense>
  );
};