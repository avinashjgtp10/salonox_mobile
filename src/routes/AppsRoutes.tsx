import { Routes, Route } from "react-router-dom"
import AddOnsPage from "../features/apps/pages/AddOnsPage"

// NOTE: The following add-on detail pages (PaymentsAddOnPage, PremiumSupportPage,
// InsightsIntroPage, etc.) live in the features/settings-ui branch.
// They will be imported here once that branch is merged into main.

export const AppsRoutes = () => (
  <Routes>
    <Route index element={<AddOnsPage />} />
    {/* Additional add-on sub-pages will be restored after settings-ui branch merge */}
  </Routes>
)
