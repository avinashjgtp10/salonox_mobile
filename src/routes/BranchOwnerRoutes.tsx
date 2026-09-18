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
const BranchOwnerStaffPermissionsPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerStaffPermissionsPage"));
const BranchOwnerSettingsPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerSettingsPage"));
const BranchOwnerHelpPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerHelpPage"));

export const BranchOwnerRoutes = (
  <Route element={<BranchOwnerGuard />}>
    <Route path="/branch-owner" element={<BranchOwnerLayout />}>
      <Route index element={<BranchOwnerDashboardPage />} />
      <Route path="salons" element={<BranchOwnerSalonsPage />} />
      <Route path="payments" element={<BranchOwnerPaymentsPage />} />
      <Route path="staff-permissions" element={<BranchOwnerStaffPermissionsPage />} />
      <Route path="inventory" element={<BranchOwnerInventoryPage />} />
      <Route path="finance" element={<BranchOwnerFinancePage />} />
      <Route path="staff-performance" element={<BranchOwnerStaffPerformancePage />} />
      <Route path="settings" element={<BranchOwnerSettingsPage />} />
      <Route path="settings/:sectionId" element={<BranchOwnerSettingsPage />} />
      <Route path="help" element={<BranchOwnerHelpPage />} />
    </Route>
  </Route>
);
