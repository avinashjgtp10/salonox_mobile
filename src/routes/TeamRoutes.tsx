import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "../components/ui";
import PermissionGuard from "../components/guards/PermissionGuard";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";
import NoPermissionPage from "../components/guards/NoPermissionPage";
import { usePermissions } from "../hooks/usePermissions";

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

const CommissionsPage = lazy(() => import("../features/staff/pages/CommissionsPage"));
const AttendancePage  = lazy(() => import("../features/staff/pages/AttendancePage"));

const StaffHistoryListPage   = lazy(() => import("../features/staff/pages/StaffHistoryListPage"));
const StaffHistoryDetailPage = lazy(() => import("../features/staff/pages/StaffHistoryDetailPage"));

const PayrollPage = lazy(() => import("../features/staff/pages/PayrollPage"));
const PayrollAdjustPage = lazy(() => import("../features/staff/pages/PayrollAdjustPage"));

// PayRuns has no dedicated permission key — the backend only ever allowed
// owner/admin roles for /staff/:id/pay-runs, so this mirrors that exactly
// rather than inventing a new permission key.
function OwnerAdminGuard() {
  const { role } = usePermissions();
  if (role === "salon_owner" || role === "admin") return <Outlet />;
  return <NoPermissionPage />;
}

export const TeamRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default → members list */}
      <Route index element={<Navigate to="members" replace />} />
      <Route path="dashboard"    element={<StaffDashboardPage />} />
      <Route path="members"      element={<StaffListPage />} />
      <Route path="appointments" element={<StaffAppointmentsPage />} />
      <Route path="customers"    element={<StaffCustomersPage />} />
      <Route path="services"     element={<StaffServicesPage />} />
      <Route path="sales"        element={<StaffSalesPage />} />
      <Route path="performance"  element={<StaffPerformancePage />} />

      {/* New pages */}
      {/* view_commissions/view_tips required — the page fetches both commission
          and tip data on mount, and the backend now enforces those keys */}
      <Route element={<PermissionGuard permKey="view_team_commissions" />}>
        <Route path="commissions" element={<CommissionsPage />} />
      </Route>

      {/* view_attendance_list gates the Attendance page itself (see the
          Attendance ticket) — Attendance Rules has no route of its own
          (it's a modal within this page), gated at the button instead. */}
      <Route element={<PermissionGuard permKey="view_attendance_list" />}>
        <Route path="attendance"  element={<AttendancePage />} />
      </Route>

      {/* view_staff_history gates Staff History (see the Staff History
          ticket) — unlike every other permission in this app, this one is
          a DELIBERATE exception: the nav entry itself is hidden when off
          (see TeamSubSidebar.tsx), not just disabled. Direct URL access
          still shows Not Authorized like everywhere else. */}
      <Route element={<PermissionGuard permKey="view_staff_history" />}>
        <Route path="history"           element={<StaffHistoryListPage />} />
        <Route path="history/:staffId"  element={<StaffHistoryDetailPage />} />
      </Route>

      {/* import_staff (dedicated, see the Staff List ticket) vs
          add_team_member (Add Staff) — two independent permissions now,
          previously both bundled under add_team_member. */}
      <Route element={<PermissionGuard permKey="import_staff" />}>
        <Route path="import" element={<ImportStaffPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="add_team_member" />}>
        <Route path="add"    element={<AddStaffPage />} />
      </Route>

      {/* edit_team_member required to edit an existing staff member */}
      <Route element={<PermissionGuard permKey="edit_team_member" />}>
        <Route path=":id" element={<AddStaffPage />} />
      </Route>

      {/* view_scheduled_shifts gates the page itself now (see the
          Scheduled Shifts ticket) — each action button (Add/Edit Working
          Hours, Add Time Off, Manage Day Off/Blocked Day, Copy Schedule)
          is independently gated inside ScheduledShiftsPage.tsx. */}
      <Route element={<PermissionGuard permKey="view_scheduled_shifts" />}>
        <Route path="shifts"               element={<ScheduledShiftsPage />} />
        <Route path="repeating-shifts/:id" element={<RepeatingShiftsPage />} />
      </Route>

      <Route element={<OwnerAdminGuard />}>
        <Route path="payruns"     element={<PayRunsPage />} />
        <Route path="payruns/:id" element={<PayRunBreakdownPage />} />
      </Route>

      {/* Payroll — data-driven rebuild. featureKey "payroll" (Advance tier)
          + view_payroll, same wrapper pattern as every other guarded route
          here. */}
      <Route element={<PlanFeatureGuard featureKey="payroll" label="Payroll" />}>
        <Route element={<PermissionGuard permKey="view_payroll" />}>
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="payroll/:staffId/adjust" element={<PayrollAdjustPage />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);