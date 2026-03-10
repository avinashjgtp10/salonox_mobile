import { Route } from "react-router-dom";

import DashboardLayout from "../features/dashboard/components/DashboardLayout";

/* SALES */
import DailySalesPage from "../features/analytics/pages/DailySalesPage";
import SalesListPage from "../features/analytics/pages/SalesListPage";

/* BOOKINGS */
import SchedulerPage from "../features/bookings/pages/SchedulerPage";

/* CLIENTS */
import ClientsListPage from "../features/clients/pages/ClientsListPage";
import AddClientPage from "../features/clients/pages/AddClientPage";
import ClientAddressesPage from "../features/clients/pages/ClientAddressesPage";

/* STAFF / TEAM */
import AddStaffPage from "../features/staff/pages/AddStaffPage";
import StaffListPage from "../features/staff/pages/StaffListPage";
import TimesheetsPage from "../features/staff/pages/TimesheetsPage";
import PayRunsPage from "../features/staff/pages/PayRunsPage";

export const DashboardRoutes = (
  <Route path="/dashboard" element={<DashboardLayout />}>

    {/* DASHBOARD HOME */}
    <Route index element={<h2>Dashboard Home</h2>} />

    {/* CALENDAR */}
    <Route path="calendar" element={<SchedulerPage />} />

    {/* SALES */}
    <Route path="sales">
      <Route index element={<SalesListPage />} />
      <Route path="daily" element={<DailySalesPage />} />
    </Route>

    {/* CLIENTS */}
    <Route path="clients">
      <Route index element={<h2>Clients Home</h2>} />
      <Route path="list" element={<ClientsListPage />} />
      <Route path="add" element={<AddClientPage />} />
      <Route path="addresses" element={<ClientAddressesPage />} />
      <Route path="loyalty" element={<h2>Client Loyalty</h2>} />
    </Route>

    {/* TEAM MANAGEMENT */}
    <Route path="team">
      <Route index element={<h2>Team Home</h2>} />

      {/* TEAM MEMBERS */}
      <Route path="members" element={<StaffListPage />} />

      {/* ADD STAFF */}
      <Route path="add" element={<AddStaffPage />} />

      {/* OTHER TEAM FEATURES */}
      <Route path="shifts" element={<h2>Scheduled shifts</h2>} />
      <Route path="timesheets" element={<TimesheetsPage />} />
      <Route path="payruns" element={<PayRunsPage />} />
    </Route>

    {/* OTHER MODULES */}
    <Route path="reports" element={<h2>Reports</h2>} />
    <Route path="staff" element={<h2>Staff</h2>} />
    <Route path="marketing" element={<h2>Marketing</h2>} />
    <Route path="analytics" element={<h2>Analytics</h2>} />
    <Route path="apps" element={<h2>Apps</h2>} />
    <Route path="settings" element={<h2>Settings</h2>} />
    <Route path="help" element={<h2>Help</h2>} />

  </Route>
);