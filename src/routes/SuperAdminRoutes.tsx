import { lazy } from "react";
import { Route } from "react-router-dom";
import SuperAdminGuard from "../components/guards/SuperAdminGuard";

const SuperAdminLoginPage = lazy(() => import("../features/super-admin/pages/SuperAdminLoginPage"));
const SuperAdminLayout    = lazy(() => import("../features/super-admin/components/SuperAdminLayout"));
const OverviewPage        = lazy(() => import("../features/super-admin/pages/OverviewPage"));
const SalonsPage          = lazy(() => import("../features/super-admin/pages/SalonsPage"));
const UsersPage           = lazy(() => import("../features/super-admin/pages/UsersPage"));
const PaymentsPage        = lazy(() => import("../features/super-admin/pages/PaymentsPage"));
const BillingPage         = lazy(() => import("../features/super-admin/pages/BillingPage"));
const PermissionsPage     = lazy(() => import("../features/super-admin/pages/PermissionsPage"));
const SubscriptionPermissionsPage = lazy(() => import("../features/super-admin/pages/SubscriptionPermissionsPage"));
const SupportPage         = lazy(() => import("../features/super-admin/pages/SupportPage"));
const DemoInquiriesPage   = lazy(() => import("../features/super-admin/pages/DemoInquiriesPage"));

export const SuperAdminRoutes = (
  <>
    <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

    <Route element={<SuperAdminGuard />}>
      <Route path="/super-admin" element={<SuperAdminLayout />}>
        <Route index               element={<OverviewPage />} />
        <Route path="salons"       element={<SalonsPage />} />
        <Route path="users"        element={<UsersPage />} />
        <Route path="payments"     element={<PaymentsPage />} />
        <Route path="billing"      element={<BillingPage />} />
        <Route path="permissions"  element={<PermissionsPage />} />
        <Route path="subscription-permissions" element={<SubscriptionPermissionsPage />} />
        <Route path="support"      element={<SupportPage />} />
        <Route path="demo-inquiries" element={<DemoInquiriesPage />} />
      </Route>
    </Route>
  </>
);
