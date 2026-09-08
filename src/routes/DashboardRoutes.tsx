// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "../features/dashboard/components/DashboardLayout";
import AuthGuard from "../components/guards/AuthGuard";
import PermissionGuard from "../components/guards/PermissionGuard";
import { DashboardProviders } from "../providers/DashboardProviders";

import { AppsRoutes } from "./AppsRoutes";
import { CatalogRoutes } from "./CatalogRoutes";
import { InventoryRoutes } from "./InventoryRoutes";
import { ClientsRoutes } from "./ClientsRoutes";
import { TeamRoutes } from "./TeamRoutes";
import { SettingsRoutes } from "./SettingsRoutes";
import { MarketingRoutes } from "./MarketingRoutes";
import { OnlineBookingRoutes } from "./OnlineBookingRoutes";
import { SpotlightRoutes } from "./SpotlightRoutes";
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

      {/* Cash Management — previously had no permission gate at all (any
          staff/manager could open/close the till and manage expenses); now
          requires view_cash_management, matching the backend fix. */}
      <Route element={<PermissionGuard permKey="view_cash_management" />}>
        <Route path="cash-management" element={<CashManagementPage />} />
      </Route>

      {/* Quick Sale — requires create_sales (reconciled with the backend's
          actual sales.routes.ts key; previously create_quick_sale, which the
          backend never checked) */}
      <Route element={<PermissionGuard permKey="create_sales" />}>
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

      {/* Inventory — requires view_inventory (moved out from under Catalog) */}
      <Route element={<PermissionGuard permKey="view_inventory" />}>
        <Route path="inventory/*" element={<InventoryRoutes />} />
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

      {/* Spotlight — accessible to all authenticated salon users; managing
          (creating/publishing) features is superadmin-only, under
          /super-admin/spotlight (see SuperAdminRoutes.tsx), not here. */}
      {SpotlightRoutes}
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
