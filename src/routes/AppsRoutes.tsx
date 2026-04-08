import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const AddOnsPage = lazy(() => import("../features/apps/pages/AddOnsPage"));

// NOTE: The followinghe  add-on detail pages (PaymentsAddOnPage, PremiumSupportPage,
// InsightsIntroPage, etc.) live in the features/settings-ui branch.
// They will be imported here once that branch is merged into main.

import { PageLoader } from "../components/ui";

export const AppsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<AddOnsPage />} />
      {/* Additional add-on sub-pages will be restored after settings-ui branch merge */}
    </Routes>
  </Suspense>
);
