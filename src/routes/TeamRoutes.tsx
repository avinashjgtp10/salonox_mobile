import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const StaffListPage = lazy(
  () => import("../features/staff/pages/StaffListPage"),
);
const AddStaffPage = lazy(() => import("../features/staff/pages/AddStaffPage"));
const PayRunsPage = lazy(() => import("../features/staff/pages/PayRunsPage"));
const PayRunBreakdownPage = lazy(
  () => import("../features/staff/pages/PayRunBreakdownPage"),
);
const RepeatingShiftsPage = lazy(
  () => import("../features/staff/pages/RepeatingShiftsPage"),
);
const ScheduledShiftsPage = lazy(
  () => import("../features/dashboard/pages/ScheduledShiftsPage"),
);

import { PageLoader } from "../components/ui";

export const TeamRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<StaffListPage />} />
      <Route path="members" element={<StaffListPage />} />
      <Route path="add" element={<AddStaffPage />} />
      <Route path="edit/:id" element={<AddStaffPage />} />
      <Route path="repeating-shifts/:id" element={<RepeatingShiftsPage />} />
      <Route path="payruns" element={<PayRunsPage />} />
      <Route path="payruns/:id" element={<PayRunBreakdownPage />} />
      <Route path="shifts" element={<ScheduledShiftsPage />} />
    </Routes>
  </Suspense>
);
