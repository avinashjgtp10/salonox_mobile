// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import DashboardLayout from "../features/dashboard/components/DashboardLayout";
import AuthGuard from "../components/guards/AuthGuard";
import PermissionGuard from "../components/guards/PermissionGuard";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";
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
      {/* Dashboard home — requires view_dashboard + featureKey "dashboard" */}
      <Route element={<PermissionGuard permKey="view_dashboard" />}>
        <Route element={<PlanFeatureGuard featureKey="dashboard" label="Dashboard" />}>
          <Route index element={<DashboardPage />} />
        </Route>
      </Route>

      {/* Calendar — requires view_calendar + featureKey "calendar" */}
      <Route element={<PermissionGuard permKey="view_calendar" />}>
        <Route element={<PlanFeatureGuard featureKey="calendar" label="Calendar" />}>
          <Route path="calendar" element={<Scheduler />} />
        </Route>
      </Route>

      {/* Legacy path — ReportsPage itself redirects to the new top-level /reports URL,
          preserving ?report=<id> deep links (e.g. dashboard's "Collect Now" shortcut) */}
      <Route element={<PermissionGuard permKey="view_reports" />}>
        <Route element={<PlanFeatureGuard featureKey="reports" label="Reports" />}>
          <Route path="analytics" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Cash Management — previously had no permission gate at all (any
          staff/manager could open/close the till and manage expenses); now
          requires view_cash_management, matching the backend fix. featureKey
          "cash_management" (plan-tier gate) still applies on top of that. */}
      <Route element={<PermissionGuard permKey="view_cash_management" />}>
        <Route element={<PlanFeatureGuard featureKey="cash_management" label="Cash Management" />}>
          <Route path="cash-management" element={<CashManagementPage />} />
        </Route>
      </Route>

      {/* Quick Sale — requires create_sales (reconciled with the backend's
          actual sales.routes.ts key; previously create_quick_sale, which the
          backend never checked) + featureKey "quick_sale" */}
      <Route element={<PermissionGuard permKey="create_sales" />}>
        <Route element={<PlanFeatureGuard featureKey="quick_sale" label="Quick Sale" />}>
          <Route path="sales/quick" element={<QuickSalePage />} />
        </Route>
      </Route>

      {/* Clients — requires view_clients + featureKey "clients" */}
      <Route element={<PermissionGuard permKey="view_clients" />}>
        <Route element={<PlanFeatureGuard featureKey="clients" label="Clients" />}>
          <Route path="clients/*" element={<ClientsRoutes />} />
        </Route>
      </Route>

      {/* Catalog — requires view_catalog. No single featureKey here: Services/
          Products/Packages/Memberships are individually gated inside
          CatalogRoutes.tsx (some are core, some Advance-tier). */}
      <Route element={<PermissionGuard permKey="view_catalog" />}>
        <Route path="catalog/*" element={<CatalogRoutes />} />
      </Route>

      {/* Inventory (Warehouse) — no single blanket permission gate here
          anymore. Suppliers now has its own independent permissions
          (view_suppliers/create_suppliers/edit_suppliers/etc. — see the
          Warehouse -> Suppliers ticket), separate from view_inventory which
          still gates the other 5 sections. A view_inventory-only gate here
          would deny Suppliers access to a staff member who has
          view_suppliers but not view_inventory, before InventoryRoutes.tsx's
          own per-section guards even get a chance to run. featureKey
          "inventory" is still enforced inside InventoryRoutes.tsx. */}
      <Route path="inventory/*" element={<InventoryRoutes />} />

      {/* Team — requires view_team. featureKey "staff"/"payroll" enforced
          per-section inside TeamRoutes.tsx already. */}
      <Route element={<PermissionGuard permKey="view_team" />}>
        <Route path="team/*" element={<TeamRoutes />} />
      </Route>

      {/* Marketing — requires view_marketing (umbrella of the 7 sub-area view
          keys — see VIRTUAL_PERMS in usePermissions.ts) + featureKey
          "marketing". Each sub-route inside MarketingRoutes.tsx has its own
          specific PermissionGuard on top of this outer gate. */}
      <Route element={<PermissionGuard permKey="view_marketing" />}>
        <Route element={<PlanFeatureGuard featureKey="marketing" label="Marketing" />}>
          <Route path="marketing/*" element={<MarketingRoutes />} />
        </Route>
      </Route>

      {/* Settings — requires general_settings. Account/config, not a product
          module — deliberately not featureKey-gated. */}
      <Route element={<PermissionGuard permKey="general_settings" />}>
        <Route path="settings/*" element={<SettingsRoutes />} />
      </Route>

      {/* Online booking — requires view_booking + featureKey "online_booking" */}
      <Route element={<PermissionGuard permKey="view_booking" />}>
        <Route element={<PlanFeatureGuard featureKey="online_booking" label="Online Booking" />}>
          <Route path="online-booking/*" element={<OnlineBookingRoutes />} />
        </Route>
      </Route>

      {/* Apps, Profile, Notifications — no permission guard needed */}
      <Route path="apps/*" element={<AppsRoutes />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="notifications" element={<NotificationsPage />} />

      {/* Enquiries — requires view_enquiries + featureKey "enquiries" */}
      <Route element={<PermissionGuard permKey="view_enquiries" />}>
        <Route element={<PlanFeatureGuard featureKey="enquiries" label="Enquiries" />}>
          <Route path="enquiries" element={<EnquiriesListPage />} />
          <Route path="enquiries/add" element={<EnquiryAddPage />} />
          <Route path="enquiries/edit/:id" element={<EnquiryAddPage />} />
        </Route>
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
