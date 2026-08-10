import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageLoader } from "../components/ui";
import SettingsLayout from "../features/settings/components/SettingsLayout";

// The Coupon Designer is a full-screen three-panel editor, so it deliberately
// sits OUTSIDE SettingsLayout's header/sidebar shell — rendering it inside
// would leave the canvas about a third narrower for no benefit. It keeps a
// /settings/ URL because it's reached from, and returns to, Settings → Coupons.
const CouponDesignerPage = lazy(() => import("../features/settings/pages/CouponDesignerPage"));

// SettingsLayout renders exactly one active section at a time (switched by
// sidebar click, not routed pages) inside a fixed header/sidebar shell. The
// sub-paths just keep deep links (e.g. /dashboard/settings/business) working
// and stay in sync with whichever section is active — SettingsLayout reads
// the path itself to decide which section to show, both on mount and on
// browser back/forward.
export const SettingsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<SettingsLayout />} />
      {/* Must precede ":section", or "coupon-designer" is swallowed as a
          section name and the editor never renders. */}
      <Route path="coupon-designer" element={<CouponDesignerPage />} />
      <Route path="coupon-designer/:id" element={<CouponDesignerPage />} />
      <Route path=":section" element={<SettingsLayout />} />
      <Route path="*" element={<SettingsLayout />} />
    </Routes>
  </Suspense>
);
