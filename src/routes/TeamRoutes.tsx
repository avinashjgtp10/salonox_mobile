import { Routes, Route } from "react-router-dom"
import StaffListPage from "../features/staff/pages/StaffListPage"
import AddStaffPage from "../features/staff/pages/AddStaffPage"
import PayRunsPage from "../features/staff/pages/PayRunsPage"
import PayRunBreakdownPage from "../features/staff/pages/PayRunBreakdownPage"
import RepeatingShiftsPage from "../features/staff/pages/RepeatingShiftsPage"
import ScheduledShiftsPage from "../features/dashboard/pages/ScheduledShiftsPage"

export const TeamRoutes = () => (
    <Routes>
      <Route index element={<StaffListPage />} />
      <Route path="members" element={<StaffListPage />} />
      <Route path="add" element={<AddStaffPage />} />
      <Route path="repeating-shifts/:id" element={<RepeatingShiftsPage />} />
      <Route path="payruns" element={<PayRunsPage />} />
      <Route path="payruns/:id" element={<PayRunBreakdownPage />} />
      <Route path="shifts" element={<ScheduledShiftsPage />} />
    </Routes>
)
