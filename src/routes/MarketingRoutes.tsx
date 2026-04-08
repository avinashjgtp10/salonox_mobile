import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";

const MarketingDashboardPage = lazy(
  () => import("../features/marketing/pages/MarketingDashboardPage"),
);
const CreateTemplatePage = lazy(
  () => import("../features/marketing/pages/CreateTemplatePage"),
);
const CreateCampaignPage = lazy(
  () => import("../features/marketing/pages/CreateCampaignPage"),
);
const WebhooksPage = lazy(
  () => import("../features/marketing/pages/WebhooksPage"),
);
const WaConfigPage = lazy(
  () => import("../features/marketing/pages/WaConfigPage"),
);

export const MarketingRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index                   element={<MarketingDashboardPage />} />
      <Route path="templates/create" element={<CreateTemplatePage />} />
      <Route path="campaigns/create" element={<CreateCampaignPage />} />
      <Route path="webhooks"         element={<WebhooksPage />} />
      <Route path="config"           element={<WaConfigPage />} />
      <Route path="*"                element={<Navigate to="/dashboard/marketing" replace />} />
    </Routes>
  </Suspense>
);
