// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "../features/dashboard/components/DashboardLayout";
import AuthGuard from "../components/guards/AuthGuard";
import PermissionGuard from "../components/guards/PermissionGuard";
import { DashboardProviders } from "../providers/DashboardProviders";

import { AppsRoutes } from "./AppsRoutes";
import { SalesRoutes } from "./SalesRoutes";
import { CatalogRoutes } from "./CatalogRoutes";
import { ClientsRoutes } from "./ClientsRoutes";
import { TeamRoutes } from "./TeamRoutes";
import { SettingsRoutes } from "./SettingsRoutes";
import { MarketingRoutes } from "./MarketingRoutes";
import { OnlineBookingRoutes } from "./OnlineBookingRoutes";

// Lazy-load the heavy dashboard-specific pages
const DashboardPage = lazy(() =>
  import("../features/dashboard/pages/DashboardPage")
);

const HelpPage = lazy(() => import("../features/help/pages/HelpPage"));

const Scheduler = lazy(() =>
  import("../features/bookings/components/calendar/Scheduler")
);

const ReportsPage = lazy(() =>
  import("../features/analytics/pages/ReportsPage")
);

const ProfilePage = lazy(() =>
  import("../features/dashboard/pages/ProfilePage")
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
      {/* Dashboard home — requires view_dashboard */}
      <Route element={<PermissionGuard permKey="view_dashboard" />}>
        <Route index element={<DashboardPage />} />
      </Route>

      {/* Calendar — requires view_appointments */}
      <Route element={<PermissionGuard permKey="view_appointments" />}>
        <Route path="calendar" element={<Scheduler />} />
      </Route>

      {/* Analytics / Reports — requires view_analytics */}
      <Route element={<PermissionGuard permKey="view_analytics" />}>
        <Route path="analytics" element={<ReportsPage />} />
      </Route>

      {/* Sales — requires view_sales (sub-routes handle create_sales internally) */}
      <Route element={<PermissionGuard permKey="view_sales" />}>
        <Route path="sales/*" element={<SalesRoutes />} />
      </Route>

      {/* Clients — requires view_clients */}
      <Route element={<PermissionGuard permKey="view_clients" />}>
        <Route path="clients/*" element={<ClientsRoutes />} />
      </Route>

      {/* Catalog — requires view_catalog */}
      <Route element={<PermissionGuard permKey="view_catalog" />}>
        <Route path="catalog/*" element={<CatalogRoutes />} />
      </Route>

      {/* Team — requires view_team */}
      <Route element={<PermissionGuard permKey="view_team" />}>
        <Route path="team/*" element={<TeamRoutes />} />
      </Route>

      {/* Marketing — requires view_marketing */}
      <Route element={<PermissionGuard permKey="view_marketing" />}>
        <Route path="marketing/*" element={<MarketingRoutes />} />
      </Route>

      {/* Settings — requires view_settings */}
      <Route element={<PermissionGuard permKey="view_settings" />}>
        <Route path="settings/*" element={<SettingsRoutes />} />
      </Route>

      {/* Online booking — requires view_appointments */}
      <Route element={<PermissionGuard permKey="view_appointments" />}>
        <Route path="online-booking/*" element={<OnlineBookingRoutes />} />
      </Route>

      {/* Apps and Profile — no permission guard needed */}
      <Route path="apps/*" element={<AppsRoutes />} />
      <Route path="profile" element={<ProfilePage />} />

      {/* Help & Support — accessible to all authenticated users */}
      <Route path="help" element={<HelpPage />} />
    </Route>
  </Route>
);
