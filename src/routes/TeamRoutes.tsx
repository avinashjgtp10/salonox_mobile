import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageLoader } from "../components/ui";

const StaffListPage       = lazy(() => import("../features/staff/pages/StaffListPage"));
const ImportStaffPage     = lazy(() => import("../features/staff/pages/ImportStaffPage"));
const AddStaffPage        = lazy(() => import("../features/staff/pages/AddStaffPage"));
const PayRunsPage         = lazy(() => import("../features/staff/pages/PayRunsPage"));
const PayRunBreakdownPage = lazy(() => import("../features/staff/pages/PayRunBreakdownPage"));
const RepeatingShiftsPage = lazy(() => import("../features/staff/pages/RepeatingShiftsPage"));
const ScheduledShiftsPage = lazy(() => import("../features/dashboard/pages/ScheduledShiftsPage"));

// New pages
const StaffDashboardPage    = lazy(() => import("../features/staff/pages/StaffDashboardPage"));
const StaffAppointmentsPage = lazy(() => import("../features/staff/pages/StaffAppointmentsPage"));
const StaffCustomersPage    = lazy(() => import("../features/staff/pages/StaffCustomersPage"));
const StaffServicesPage     = lazy(() => import("../features/staff/pages/StaffServicesPage"));
const StaffSalesPage        = lazy(() => import("../features/staff/pages/StaffSalesPage"));

export const TeamRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default → overview dashboard */}
      <Route index element={<StaffDashboardPage />} />
      <Route path="dashboard"    element={<StaffDashboardPage />} />

      {/* Team management */}
      <Route path="members"      element={<StaffListPage />} />
      <Route path="import"       element={<ImportStaffPage />} />
      <Route path="add"          element={<AddStaffPage />} />
      <Route path=":id"          element={<AddStaffPage />} />

      {/* New feature pages */}
      <Route path="appointments" element={<StaffAppointmentsPage />} />
      <Route path="customers"    element={<StaffCustomersPage />} />
      <Route path="services"     element={<StaffServicesPage />} />
      <Route path="sales"        element={<StaffSalesPage />} />

      {/* Existing pages */}
      <Route path="shifts"                   element={<ScheduledShiftsPage />} />
      <Route path="payruns"                  element={<PayRunsPage />} />
      <Route path="payruns/:id"              element={<PayRunBreakdownPage />} />
      <Route path="repeating-shifts/:id"     element={<RepeatingShiftsPage />} />
    </Routes>
  </Suspense>
);
