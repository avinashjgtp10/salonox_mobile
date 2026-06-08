import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SaleProvider } from "../features/analytics/context/SaleContext";

const SalesListPage = lazy(
  () => import("../features/sales/pages/SalesListPage"),
);
const QuickSalePage = lazy(
  () => import("../features/sales/pages/QuickSalePage"),
);
const DailySalesPage = lazy(
  () => import("../features/analytics/pages/DailySalesPage"),
);
const AppointmentsPage = lazy(
  () => import("../features/analytics/pages/AppointmentsPage"),
);
const PaymentsPage = lazy(
  () => import("../features/analytics/pages/PaymentsPage"),
);
const GiftCardsPage = lazy(
  () => import("../features/analytics/pages/GiftCardsPage"),
);
const MembershipsPage = lazy(
  () => import("../features/analytics/pages/MembershipsPage"),
);

import { PageLoader } from "../components/ui";

export const SalesRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <SaleProvider>
      <Routes>
        {/* Default: /sales → appointments */}
        <Route index element={<Navigate to="appointments" replace />} />
        <Route path="list" element={<SalesListPage />} />
        <Route path="quick" element={<QuickSalePage />} />
        <Route path="daily" element={<DailySalesPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="gift-cards" element={<GiftCardsPage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="*" element={<Navigate to="appointments" replace />} />
      </Routes>
    </SaleProvider>
  </Suspense>
);
