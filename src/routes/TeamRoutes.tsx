import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import PermissionGuard from "../components/guards/PermissionGuard";

const StaffListPage       = lazy(() => import("../features/staff/pages/StaffListPage"));
const ImportStaffPage     = lazy(() => import("../features/staff/pages/ImportStaffPage"));
const AddStaffPage        = lazy(() => import("../features/staff/pages/AddStaffPage"));
const PayRunsPage         = lazy(() => import("../features/staff/pages/PayRunsPage"));
const PayRunBreakdownPage = lazy(() => import("../features/staff/pages/PayRunBreakdownPage"));
const RepeatingShiftsPage = lazy(() => import("../features/staff/pages/RepeatingShiftsPage"));
const ScheduledShiftsPage = lazy(() => import("../features/dashboard/pages/ScheduledShiftsPage"));

const StaffDashboardPage     = lazy(() => import("../features/staff/pages/StaffDashboardPage"));
const StaffAppointmentsPage  = lazy(() => import("../features/staff/pages/StaffAppointmentsPage"));
const StaffCustomersPage     = lazy(() => import("../features/staff/pages/StaffCustomersPage"));
const StaffServicesPage      = lazy(() => import("../features/staff/pages/StaffServicesPage"));
const StaffSalesPage         = lazy(() => import("../features/staff/pages/StaffSalesPage"));
const StaffPerformancePage   = lazy(() => import("../features/staff/pages/StaffPerformancePage"));

export const TeamRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default → members list (view_team outer guard wraps entire route tree) */}
      <Route index element={<Navigate to="members" replace />} />
      <Route path="dashboard"    element={<StaffDashboardPage />} />
      <Route path="members"      element={<StaffListPage />} />
      <Route path="appointments" element={<StaffAppointmentsPage />} />
      <Route path="customers"    element={<StaffCustomersPage />} />
      <Route path="services"     element={<StaffServicesPage />} />
      <Route path="sales"        element={<StaffSalesPage />} />
      <Route path="performance"  element={<StaffPerformancePage />} />

      {/* manage_team required to add/edit/import staff */}
      <Route element={<PermissionGuard permKey="manage_team" />}>
        <Route path="import" element={<ImportStaffPage />} />
        <Route path="add"    element={<AddStaffPage />} />
        <Route path=":id"    element={<AddStaffPage />} />
      </Route>

      {/* manage_shifts required for schedule management */}
      <Route element={<PermissionGuard permKey="manage_shifts" />}>
        <Route path="shifts"                 element={<ScheduledShiftsPage />} />
        <Route path="repeating-shifts/:id"   element={<RepeatingShiftsPage />} />
      </Route>

      {/* view_payroll required for pay run access */}
      <Route element={<PermissionGuard permKey="view_payroll" />}>
        <Route path="payruns"      element={<PayRunsPage />} />
        <Route path="payruns/:id"  element={<PayRunBreakdownPage />} />
      </Route>
    </Routes>
  </Suspense>
);
