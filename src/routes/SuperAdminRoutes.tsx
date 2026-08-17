import { lazy } from "react";
import { Route } from "react-router-dom";
import SuperAdminGuard from "../components/guards/SuperAdminGuard";

const SuperAdminLoginPage = lazy(() => import("../features/super-admin/pages/SuperAdminLoginPage"));
const SuperAdminLayout    = lazy(() => import("../features/super-admin/components/SuperAdminLayout"));
const OverviewPage        = lazy(() => import("../features/super-admin/pages/OverviewPage"));
const SalonsPage          = lazy(() => import("../features/super-admin/pages/SalonsPage"));
const SalonDetailPage     = lazy(() => import("../features/super-admin/pages/SalonDetailPage"));
const VisitedPage         = lazy(() => import("../features/super-admin/pages/VisitedPage"));
const PermissionsPage     = lazy(() => import("../features/super-admin/pages/PermissionsPage"));
const SubscriptionPermissionsPage = lazy(() => import("../features/super-admin/pages/SubscriptionPermissionsPage"));
const SupportPage         = lazy(() => import("../features/super-admin/pages/SupportPage"));
const DemoInquiriesPage   = lazy(() => import("../features/super-admin/pages/DemoInquiriesPage"));
const DeploymentAnnouncementsPage = lazy(() => import("../features/super-admin/pages/DeploymentAnnouncementsPage"));

export const SuperAdminRoutes = (
  <>
    <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

    <Route element={<SuperAdminGuard />}>
      <Route path="/super-admin" element={<SuperAdminLayout />}>
        <Route index               element={<OverviewPage />} />
        <Route path="salons"       element={<SalonsPage />} />
        <Route path="salons/:salonId" element={<SalonDetailPage />} />
        <Route path="visited"      element={<VisitedPage />} />
        <Route path="permissions"  element={<PermissionsPage />} />
        <Route path="subscription-permissions" element={<SubscriptionPermissionsPage />} />
        <Route path="support"      element={<SupportPage />} />
        <Route path="demo-inquiries" element={<DemoInquiriesPage />} />
        <Route path="deployment-announcements" element={<DeploymentAnnouncementsPage />} />
      </Route>
    </Route>
  </>
);
