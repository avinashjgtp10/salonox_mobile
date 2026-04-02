import { Routes, Route } from "react-router-dom"
import AddOnsPage from "../features/apps/pages/AddOnsPage"
import PaymentsAddOnPage from "../features/settings/pages/PaymentsAddOnPage"
import PremiumSupportPage from "../features/settings/pages/PremiumSupportPage"
import InsightsIntroPage from "../features/settings/pages/InsightsIntroPage"
import EnableInsightsDetailsPage from "../features/settings/pages/EnableInsightsDetailsPage"
import GoogleRatingBoostIntroPage from "../features/settings/pages/GoogleRatingBoostIntroPage"
import EnableGoogleRatingBoostPage from "../features/settings/pages/EnableGoogleRatingBoostPage"
import ClientLoyaltyIntroPage from "../features/settings/pages/ClientLoyaltyIntroPage"
import EnableClientLoyaltyPage from "../features/settings/pages/EnableClientLoyaltyPage"
import DataConnectorIntroPage from "../features/settings/pages/DataConnectorIntroPage"
import EnableDataConnectorPage from "../features/settings/pages/EnableDataConnectorPage"
import BookableResourcesIntroPage from "../features/settings/pages/BookableResourcesIntroPage"
import BookableResourcesPage from "../features/settings/pages/BookableResourcesPage"
import SocialBookingsIntroPage from "../features/settings/pages/SocialBookingsIntroPage"
import MetaPixelIntroPage from "../features/settings/pages/MetaPixelIntroPage"

export const AppsRoutes = () => (
    <Routes>
      <Route index element={<AddOnsPage />} />
      <Route path="payments" element={<PaymentsAddOnPage />} />
      <Route path="premium-support" element={<PremiumSupportPage />} />
      <Route path="insights" element={<InsightsIntroPage />} />
      <Route path="insights/enable" element={<EnableInsightsDetailsPage />} />
      <Route path="google-rating-boost" element={<GoogleRatingBoostIntroPage />} />
      <Route path="google-rating-boost/enable" element={<EnableGoogleRatingBoostPage />} />
      <Route path="client-loyalty" element={<ClientLoyaltyIntroPage />} />
      <Route path="client-loyalty/enable" element={<EnableClientLoyaltyPage />} />
      <Route path="data-connector" element={<DataConnectorIntroPage />} />
      <Route path="data-connector/enable" element={<EnableDataConnectorPage />} />
      <Route path="bookable-resources" element={<BookableResourcesIntroPage />} />
      <Route path="bookable-resources/manage" element={<BookableResourcesPage />} />
      <Route path="social-bookings" element={<SocialBookingsIntroPage />} />
      <Route path="meta-pixel" element={<MetaPixelIntroPage />} />
    </Routes>
)
