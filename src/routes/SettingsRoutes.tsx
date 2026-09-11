import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageLoader } from "../components/ui";
import SettingsLayout from "../features/settings/components/SettingsLayout";

// The Coupon Designer is a full-screen three-panel editor, so it deliberately
// sits OUTSIDE SettingsLayout's header/sidebar shell — rendering it inside
// would leave the canvas about a third narrower for no benefit. It keeps a
// /settings/ URL because it's reached from, and returns to, Settings → Coupons.
const CouponDesignerPage = lazy(() => import("../features/settings/pages/CouponDesignerPage"));
// Full-page replacement for the old Individual Staff permissions modal —
// same reasoning as Coupon Designer above: needs its own URL and sits
// outside SettingsLayout's section-swap shell (own breadcrumb/header), but
// stays under Settings (reached from Settings -> Roles & Permissions ->
// Individual Staff).
const IndividualStaffPermissionsPage = lazy(() => import("../features/settings/pages/IndividualStaffPermissionsPage"));
// SettingsLayout's own routing (path=":section") only supports ONE path
// segment per section, so Roles & Permissions' 4 sub-views (Manager/Staff/
// Individual Staff/Permission Activity) need their own explicit multi-segment
// routes here — same component (RolesPermissionsPage) for all 4, it reads
// which one is active from the URL itself (see tabFromPath inside it).
const RolesPermissionsPage = lazy(() => import("../features/settings/pages/RolesPermissionsPage"));

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
      {/* Must also precede ":section", same reason as coupon-designer above. */}
      <Route path="roles/manager" element={<RolesPermissionsPage />} />
      <Route path="roles/staff" element={<RolesPermissionsPage />} />
      <Route path="roles/individual-staff" element={<RolesPermissionsPage />} />
      <Route path="roles/individual-staff/:staffId" element={<IndividualStaffPermissionsPage />} />
      <Route path="roles/activity" element={<RolesPermissionsPage />} />
      <Route path=":section" element={<SettingsLayout />} />
      <Route path="*" element={<SettingsLayout />} />
    </Routes>
  </Suspense>
);
