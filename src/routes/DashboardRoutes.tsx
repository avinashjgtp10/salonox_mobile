// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "../features/dashboard/components/DashboardLayout";
import AuthGuard from "../components/guards/AuthGuard";
import { DashboardProviders } from "../providers/DashboardProviders";

import { AppsRoutes } from "./AppsRoutes";
import { SalesRoutes } from "./SalesRoutes";
import { CatalogRoutes } from "./CatalogRoutes";
import { ClientsRoutes } from "./ClientsRoutes";
import { TeamRoutes } from "./TeamRoutes";
import { SettingsRoutes } from "./SettingsRoutes";

// Lazy-load the heavy dashboard-specific pages
const DashboardPage = lazy(
  () => import("../features/dashboard/pages/DashboardPage"),
);
const Scheduler = lazy(
  () => import("../features/bookings/components/calendar/Scheduler"),
);
const ReportsPage = lazy(
  () => import("../features/analytics/pages/ReportsPage"),
);

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
      <Route path="analytics" element={<ReportsPage />} />
      <Route path="apps/*" element={<AppsRoutes />} />
      <Route path="sales/*" element={<SalesRoutes />} />
      <Route path="catalog/*" element={<CatalogRoutes />} />
      <Route path="clients/*" element={<ClientsRoutes />} />
      <Route path="team/*" element={<TeamRoutes />} />
      <Route path="settings/*" element={<SettingsRoutes />} />
    </Route>
  </Route>
);
