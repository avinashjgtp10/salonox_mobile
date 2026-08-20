import { lazy } from "react";
import { Route } from "react-router-dom";
import BranchOwnerGuard from "../components/guards/BranchOwnerGuard";

const BranchOwnerLayout        = lazy(() => import("../features/branch-owner/components/BranchOwnerLayout"));
const BranchOwnerDashboardPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerDashboardPage"));
const BranchOwnerSalonsPage    = lazy(() => import("../features/branch-owner/pages/BranchOwnerSalonsPage"));
const BranchOwnerPaymentsPage  = lazy(() => import("../features/branch-owner/pages/BranchOwnerPaymentsPage"));
const BranchOwnerPlaceholderPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerPlaceholderPage"));
const BranchOwnerInventoryPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerInventoryPage"));
const BranchOwnerFinancePage   = lazy(() => import("../features/branch-owner/pages/BranchOwnerFinancePage"));
const BranchOwnerStaffPerformancePage = lazy(() => import("../features/branch-owner/pages/BranchOwnerStaffPerformancePage"));
const BranchOwnerMembershipSharingPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerMembershipSharingPage"));
const BranchOwnerPackageSharingPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerPackageSharingPage"));

export const BranchOwnerRoutes = (
  <Route element={<BranchOwnerGuard />}>
    <Route path="/branch-owner" element={<BranchOwnerLayout />}>
      <Route index element={<BranchOwnerDashboardPage />} />
      <Route path="salons" element={<BranchOwnerSalonsPage />} />
      <Route path="payments" element={<BranchOwnerPaymentsPage />} />
      <Route path="staff-permissions" element={<BranchOwnerPlaceholderPage title="Staff & Permissions" />} />
      <Route path="inventory" element={<BranchOwnerInventoryPage />} />
      <Route path="finance" element={<BranchOwnerFinancePage />} />
      <Route path="staff-performance" element={<BranchOwnerStaffPerformancePage />} />
      <Route path="membership-sharing" element={<BranchOwnerMembershipSharingPage />} />
      <Route path="package-sharing" element={<BranchOwnerPackageSharingPage />} />
      <Route path="settings" element={<BranchOwnerPlaceholderPage title="Settings" />} />
      <Route path="help" element={<BranchOwnerPlaceholderPage title="Help" />} />
    </Route>
  </Route>
);
