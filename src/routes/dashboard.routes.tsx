import { Route } from "react-router-dom"
import DashboardLayout from "../features/dashboard/pages/DashboardPage"
import DailySalesPage from "../features/analytics/pages/DailySalesPage"

export const DashboardRoutes = (
  <Route path="/dashboard" element={<DashboardLayout />}>

    <Route index element={<h2>Dashboard Home</h2>} />
    <Route path="calendar" element={<h2>Calendar</h2>} />
    <Route path="sales/daily" element={<DailySalesPage />} />
     <Route path="clients">
    <Route index element={<h2>Clients Home</h2>} />
   <Route path="list" element={<h2>Clients List</h2>} />
  <Route path="loyalty" element={<h2>Client Loyalty</h2>} />
   </Route>   
 <Route path="reports" element={<h2>Reports</h2>} />
    <Route path="staff" element={<h2>Staff</h2>} />
    <Route path="marketing" element={<h2>Marketing</h2>} />
    <Route path="team" element={<h2>Team</h2>} />
    <Route path="analytics" element={<h2>Analytics</h2>} />
    <Route path="apps" element={<h2>Apps</h2>} />
    <Route path="settings" element={<h2>Settings</h2>} />
    <Route path="help" element={<h2>Help</h2>} />

  </Route>
)