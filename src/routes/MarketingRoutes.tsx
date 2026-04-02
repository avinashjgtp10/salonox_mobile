import { Routes, Route, Navigate } from 'react-router-dom'
import MarketingDashboardPage from '../features/marketing/pages/MarketingDashboardPage'
import CreateTemplatePage     from '../features/marketing/pages/CreateTemplatePage'
import CreateCampaignPage     from '../features/marketing/pages/CreateCampaignPage'
import WebhooksPage           from '../features/marketing/pages/WebhooksPage'
import WaConfigPage           from '../features/marketing/pages/WaConfigPage'

export const MarketingRoutes = () => (
  <Routes>
    <Route index                     element={<MarketingDashboardPage />} />
    <Route path="templates/create"   element={<CreateTemplatePage />} />
    <Route path="campaigns/create"   element={<CreateCampaignPage />} />
    <Route path="webhooks"           element={<WebhooksPage />} />
    <Route path="config"             element={<WaConfigPage />} />
    <Route path="*"                  element={<Navigate to="/dashboard/marketing" replace />} />
  </Routes>
)