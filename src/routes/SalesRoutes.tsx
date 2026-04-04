import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { SaleProvider } from "../features/analytics/context/SaleContext"

const SalesListPage    = lazy(() => import("../features/analytics/pages/SalesListPage"))
const DailySalesPage   = lazy(() => import("../features/analytics/pages/DailySalesPage"))
const AppointmentsPage = lazy(() => import("../features/analytics/pages/AppointmentsPage"))
const PaymentsPage     = lazy(() => import("../features/analytics/pages/PaymentsPage"))
const GiftCardsPage    = lazy(() => import("../features/analytics/pages/GiftCardsPage"))
const MembershipsPage  = lazy(() => import("../features/analytics/pages/MembershipsPage"))

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
    <div className="spinner-border text-primary" role="status" />
  </div>
)

export const SalesRoutes = () => (
  <Suspense fallback={<PageLoader />}>
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
  </Suspense>
)

