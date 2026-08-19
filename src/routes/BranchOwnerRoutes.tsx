import { lazy } from "react";
import { Route } from "react-router-dom";
import BranchOwnerGuard from "../components/guards/BranchOwnerGuard";

const BranchOwnerLayout        = lazy(() => import("../features/branch-owner/components/BranchOwnerLayout"));
const BranchOwnerDashboardPage = lazy(() => import("../features/branch-owner/pages/BranchOwnerDashboardPage"));
const BranchOwnerSalonsPage    = lazy(() => import("../features/branch-owner/pages/BranchOwnerSalonsPage"));
const BranchOwnerPaymentsPage  = lazy(() => import("../features/branch-owner/pages/BranchOwnerPaymentsPage"));

export const BranchOwnerRoutes = (
  <Route element={<BranchOwnerGuard />}>
    <Route path="/branch-owner" element={<BranchOwnerLayout />}>
      <Route index element={<BranchOwnerDashboardPage />} />
      <Route path="salons" element={<BranchOwnerSalonsPage />} />
      <Route path="payments" element={<BranchOwnerPaymentsPage />} />
    </Route>
  </Route>
);
