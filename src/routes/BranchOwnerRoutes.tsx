import { lazy } from "react";
import { Route } from "react-router-dom";
import BranchOwnerGuard from "../components/guards/BranchOwnerGuard";

const BranchOwnerLayout      = lazy(() => import("../features/branch-owner/components/BranchOwnerLayout"));
const BranchOwnerSalonsPage  = lazy(() => import("../features/branch-owner/pages/BranchOwnerSalonsPage"));

export const BranchOwnerRoutes = (
  <Route element={<BranchOwnerGuard />}>
    <Route path="/branch-owner" element={<BranchOwnerLayout />}>
      <Route index element={<BranchOwnerSalonsPage />} />
    </Route>
  </Route>
);
