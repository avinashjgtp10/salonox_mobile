import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui";

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

export const OnlineBookingRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<MarketplaceProfilePage />} />
      <Route path="marketplace" element={<MarketplaceProfilePage />} />
      <Route path="google" element={<ReserveWithGooglePage />} />
      <Route path="social" element={<SocialBookingsPage />} />
      <Route path="links" element={<LinkBuilderPage />} />
      <Route path="*" element={<Navigate to="/dashboard/online-booking" replace />} />
    </Routes>
  </Suspense>
);
