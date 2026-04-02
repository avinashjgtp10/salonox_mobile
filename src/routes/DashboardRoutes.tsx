import { Route } from "react-router-dom"
import DashboardPage from "../features/dashboard/pages/DashboardPage"
import DashboardLayout from "../features/dashboard/components/DashboardLayout"
import Scheduler from "../features/bookings/components/calendar/Scheduler"
import AuthGuard from "../components/guards/AuthGuard"
import { DashboardProviders } from "../providers/DashboardProviders"

import { AppsRoutes } from "./AppsRoutes"
import { SalesRoutes } from "./SalesRoutes"
import { CatalogRoutes } from "./CatalogRoutes"
import { ClientsRoutes } from "./ClientsRoutes"
import { TeamRoutes } from "./TeamRoutes"
import { SettingsRoutes } from "./SettingsRoutes"

export const DashboardRoutes = (
  <Route element={<AuthGuard />}>
    <Route
      path="/dashboard"
      element={
        <DashboardProviders>
          <DashboardLayout />
        </DashboardProviders>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="calendar" element={<Scheduler />} />
      <Route path="apps/*" element={<AppsRoutes />} />
      <Route path="sales/*" element={<SalesRoutes />} />
      <Route path="catalog/*" element={<CatalogRoutes />} />
      <Route path="clients/*" element={<ClientsRoutes />} />
      <Route path="team/*" element={<TeamRoutes />} />
      <Route path="settings/*" element={<SettingsRoutes />} />
    </Route>
  </Route>
)
