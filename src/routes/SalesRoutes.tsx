import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SaleProvider } from "../features/analytics/context/SaleContext";
import PermissionGuard from "../components/guards/PermissionGuard";

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
        <Route index element={<SalesListPage />} />
        <Route path="list" element={<SalesListPage />} />
        {/* Quick sale requires create_sales on top of the outer view_sales guard */}
        <Route element={<PermissionGuard permKey="create_sales" />}>
          <Route path="quick" element={<QuickSalePage />} />
        </Route>
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
