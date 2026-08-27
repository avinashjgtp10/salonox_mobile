import { lazy } from "react";
import { Route } from "react-router-dom";

const SpotlightListPage = lazy(() => import("../features/feature-spotlight/pages/SpotlightListPage"));
const SpotlightDetailPage = lazy(() => import("../features/feature-spotlight/pages/SpotlightDetailPage"));

// The three tab routes are literal (static) segments, so React Router ranks
// them above the dynamic `spotlight/:id` detail route below — real feature
// ids are always prefixed "spotlight-...", so there's no collision with the
// "new" / "recently-updated" / "all" literals.
export const SpotlightRoutes = (
  <>
    <Route path="spotlight" element={<SpotlightListPage />} />
    <Route path="spotlight/new" element={<SpotlightListPage />} />
    <Route path="spotlight/recently-updated" element={<SpotlightListPage />} />
    <Route path="spotlight/all" element={<SpotlightListPage />} />
    <Route path="spotlight/:id" element={<SpotlightDetailPage />} />
  </>
);
