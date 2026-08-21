// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "../features/dashboard/components/DashboardLayout";
import AuthGuard from "../components/guards/AuthGuard";
import PermissionGuard from "../components/guards/PermissionGuard";
import { DashboardProviders } from "../providers/DashboardProviders";

import { AppsRoutes } from "./AppsRoutes";
import { CatalogRoutes } from "./CatalogRoutes";
import { ClientsRoutes } from "./ClientsRoutes";
import { TeamRoutes } from "./TeamRoutes";
import { SettingsRoutes } from "./SettingsRoutes";
import { MarketingRoutes } from "./MarketingRoutes";
import { OnlineBookingRoutes } from "./OnlineBookingRoutes";
import { preloadCashManagementPage, preloadScheduler } from "./dashboardPreloaders";

// Lazy-load the heavy dashboard-specific pages
const DashboardPage = lazy(() =>
  import("../features/dashboard/pages/DashboardPage")
);

const HelpPage = lazy(() => import("../features/help/pages/HelpPage"));

const Scheduler = lazy(preloadScheduler);

const ReportsPage = lazy(() =>
  import("../features/analytics/pages/ReportsPage")
);

const CashManagementPage = lazy(preloadCashManagementPage);

const QuickSalePage = lazy(() =>
  import("../features/sales/pages/QuickSalePage")
);

const ProfilePage = lazy(() =>
  import("../features/dashboard/pages/ProfilePage")
);

const NotificationsPage = lazy(() =>
  import("../features/dashboard/pages/NotificationsPage")
);

const EnquiriesListPage = lazy(() =>
  import("../features/enquiries/pages/EnquiriesListPage")
);

const EnquiryAddPage = lazy(() =>
  import("../features/enquiries/pages/EnquiryAddPage")
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

      {/* Calendar — requires view_calendar */}
      <Route element={<PermissionGuard permKey="view_calendar" />}>
        <Route path="calendar" element={<Scheduler />} />
      </Route>

      {/* Legacy path — ReportsPage itself redirects to the new top-level /reports URL,
          preserving ?report=<id> deep links (e.g. dashboard's "Collect Now" shortcut) */}
      <Route element={<PermissionGuard permKey="view_reports" />}>
        <Route path="analytics" element={<ReportsPage />} />
      </Route>

      {/* Cash Management — no permission gate, visible to all staff/managers */}
      <Route path="cash-management" element={<CashManagementPage />} />

      {/* Quick Sale — requires create_quick_sale */}
      <Route element={<PermissionGuard permKey="create_quick_sale" />}>
        <Route path="sales/quick" element={<QuickSalePage />} />
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

      {/* Marketing — requires view_campaigns */}
      <Route element={<PermissionGuard permKey="view_campaigns" />}>
        <Route path="marketing/*" element={<MarketingRoutes />} />
      </Route>

      {/* Settings — requires general_settings */}
      <Route element={<PermissionGuard permKey="general_settings" />}>
        <Route path="settings/*" element={<SettingsRoutes />} />
      </Route>

      {/* Online booking — requires view_booking */}
      <Route element={<PermissionGuard permKey="view_booking" />}>
        <Route path="online-booking/*" element={<OnlineBookingRoutes />} />
      </Route>

      {/* Apps, Profile, Notifications — no permission guard needed */}
      <Route path="apps/*" element={<AppsRoutes />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="notifications" element={<NotificationsPage />} />

      {/* Enquiries — requires view_enquiries */}
      <Route element={<PermissionGuard permKey="view_enquiries" />}>
        <Route path="enquiries" element={<EnquiriesListPage />} />
        <Route path="enquiries/add" element={<EnquiryAddPage />} />
        <Route path="enquiries/edit/:id" element={<EnquiryAddPage />} />
      </Route>

      {/* Help & Support — accessible to all authenticated users */}
      <Route path="help" element={<HelpPage />} />
    </Route>

    {/* Reports — top-level /reports/... (not under /dashboard), same layout/guards */}
    <Route
      path="/reports"
      element={
        <DashboardProviders>
          <DashboardLayout />
        </DashboardProviders>
      }
    >
      <Route element={<PermissionGuard permKey="view_reports" />}>
        <Route index element={<ReportsPage />} />
        <Route path=":category/:reportSlug" element={<ReportsPage />} />
      </Route>
    </Route>
  </Route>
);
