import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";

const MarketingDashboardPage = lazy(() => import("../features/marketing/pages/MarketingDashboardPage"));
const TemplatesListPage      = lazy(() => import("../features/marketing/pages/TemplatesListPage"));
const CreateTemplatePage     = lazy(() => import("../features/marketing/pages/CreateTemplatePage"));
const CreateCampaignPage     = lazy(() => import("../features/marketing/pages/CreateCampaignPage"));
const CampaignHistoryPage    = lazy(() => import("../features/marketing/pages/CampaignHistoryPage"));
const InboxPage              = lazy(() => import("../features/marketing/pages/InboxPage"));
const WebhooksPage           = lazy(() => import("../features/marketing/pages/WebhooksPage"));
const WaConfigPage           = lazy(() => import("../features/marketing/pages/WaConfigPage"));
const QuickWhatsAppPage      = lazy(() => import("../features/marketing/pages/QuickWhatsAppPage"));

export const MarketingRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index                       element={<MarketingDashboardPage />} />
      <Route path="templates"            element={<TemplatesListPage />} />
      <Route path="templates/create"     element={<CreateTemplatePage />} />
      <Route path="campaigns/create"     element={<CreateCampaignPage />} />
      <Route path="campaigns/history"    element={<CampaignHistoryPage />} />
      <Route path="inbox"                element={<InboxPage />} />
      <Route path="quick-whatsapp"       element={<QuickWhatsAppPage />} />
      <Route path="webhooks"             element={<WebhooksPage />} />
      <Route path="config"               element={<WaConfigPage />} />
      <Route path="*"                    element={<Navigate to="/dashboard/marketing" replace />} />
    </Routes>
  </Suspense>
);