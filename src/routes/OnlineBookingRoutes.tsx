import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";
import PermissionGuard from "../components/guards/PermissionGuard";

const MarketplaceProfilePage = lazy(
  () => import("../features/online-booking/pages/MarketplaceProfilePage"),
);
const ReserveWithGooglePage = lazy(
  () => import("../features/online-booking/pages/ReserveWithGooglePage"),
);
const SocialBookingsPage = lazy(
  () => import("../features/online-booking/pages/SocialBookingsPage"),
);
const LinkBuilderPage = lazy(
  () => import("../features/online-booking/pages/LinkBuilderPage"),
);

// Each channel has its own independent View toggle (Online Booking Channels
// ticket) on top of the outer view_booking gate already applied in
// DashboardRoutes.tsx — the sub-sidebar's disabled links are the real UX
// gate, these are the backstop against typing a channel's URL directly.
export const OnlineBookingRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<PermissionGuard permKey="view_marketplace" />}>
        <Route index element={<MarketplaceProfilePage />} />
        <Route path="marketplace" element={<MarketplaceProfilePage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_reserve_with_google" />}>
        <Route path="google" element={<ReserveWithGooglePage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_social_bookings" />}>
        <Route path="social" element={<SocialBookingsPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_link_builder" />}>
        <Route path="links" element={<LinkBuilderPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard/online-booking" replace />} />
    </Routes>
  </Suspense>
);
