import { Routes, Route } from "react-router-dom"
import { SaleProvider } from "../features/analytics/context/SaleContext"
import SalesListPage from "../features/analytics/pages/SalesListPage"
import DailySalesPage from "../features/analytics/pages/DailySalesPage"
import AppointmentsPage from "../features/analytics/pages/AppointmentsPage"
import PaymentsPage from "../features/analytics/pages/PaymentsPage"
import GiftCardsPage from "../features/analytics/pages/GiftCardsPage"
import MembershipsPage from "../features/analytics/pages/MembershipsPage"

export const SalesRoutes = () => (
  <SaleProvider>
    <Routes>
      <Route index element={<SalesListPage />} />
      <Route path="daily" element={<DailySalesPage />} />
      <Route path="appointments" element={<AppointmentsPage />} />
      <Route path="payments" element={<PaymentsPage />} />
      <Route path="gift-cards" element={<GiftCardsPage />} />
      <Route path="memberships" element={<MembershipsPage />} />
    </Routes>
  </SaleProvider>
)
