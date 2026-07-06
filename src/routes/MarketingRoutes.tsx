import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../hooks/useAppRedux";
import { fetchWaConfigThunk } from "../middleware/marketing/marketing.thunk";
import MarketingOnboardingPage from "../features/marketing/pages/MarketingOnboardingPage";

const MarketingDashboardPage = lazy(() => import("../features/marketing/pages/MarketingDashboardPage"));
const AnalyticsPage          = lazy(() => import("../features/marketing/pages/AnalyticsPage"));
const TemplatesListPage      = lazy(() => import("../features/marketing/pages/TemplatesListPage"));
const CreateTemplatePage     = lazy(() => import("../features/marketing/pages/CreateTemplatePage"));
const CreateCampaignPage     = lazy(() => import("../features/marketing/pages/CreateCampaignPage"));
const CampaignHistoryPage    = lazy(() => import("../features/marketing/pages/CampaignHistoryPage"));
const InboxPage              = lazy(() => import("../features/marketing/pages/InboxPage"));
const QuickWhatsAppPage      = lazy(() => import("../features/marketing/pages/QuickWhatsAppPage"));
const WebhooksPage           = lazy(() => import("../features/marketing/pages/WebhooksPage"));
const WaConfigPage           = lazy(() => import("../features/marketing/pages/WaConfigPage"));
const WaAutomationPage       = lazy(() => import("../features/marketing/pages/WaAutomationPage"));

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
        <Route path="campaigns/create"  element={<CreateCampaignPage />} />
        <Route path="campaigns/history" element={<CampaignHistoryPage />} />
        <Route path="inbox"             element={<InboxPage />} />
        <Route path="quick-whatsapp"    element={<QuickWhatsAppPage />} />
        <Route path="webhooks"          element={<WebhooksPage />} />
        <Route path="wa-automation"     element={<WaAutomationPage />} />
        <Route path="config"            element={<WaConfigPage />} />
        <Route path="*"                 element={<Navigate to="/dashboard/marketing" replace />} />
      </Routes>
    </Suspense>
  );
};