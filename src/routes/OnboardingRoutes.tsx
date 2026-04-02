import { Route } from "react-router-dom"
import AccountTypePage from "../features/auth/pages/AccountTypePage"
import BusinessNamePage from "../features/auth/pages/BusinessNamePage"
import ServiceTypePage from "../features/auth/pages/ServiceTypePage"
import TeamSetupPage from "../features/auth/pages/TeamSetupPage.tsx"
import BusinessLocationPage from "../features/auth/pages/BusinessLocationPage"
import VenueLocationPage from "../features/auth/pages/VenueLocationPage"
import PreviousSoftwarePage from "../features/auth/pages/PreviousSoftwarePage"
import RecommendationSourcePage from "../features/auth/pages/RecommendationSourcePage"
import SetupCompletePage from "../features/auth/pages/SetupCompletePage"
import JoinBusinessPage from "../features/auth/pages/JoinBusinessPage"
import TeamSizePage from "../features/auth/pages/TeamSizePage"
import { OnboardingProvider } from "../context/OnboardingContext"
import OnboardingGuard from "../components/guards/OnboardingGuard"

export const OnboardingRoutes = (
  <Route element={<OnboardingGuard />}>
    <Route path="/account-type" element={<OnboardingProvider><AccountTypePage /></OnboardingProvider>} />
    <Route path="/business-name" element={<OnboardingProvider><BusinessNamePage /></OnboardingProvider>} />
    <Route path="/service-type" element={<OnboardingProvider><ServiceTypePage /></OnboardingProvider>} />
    <Route path="/team-setup" element={<OnboardingProvider><TeamSetupPage /></OnboardingProvider>} />
    <Route path="/team-size" element={<OnboardingProvider><TeamSizePage /></OnboardingProvider>} />
    <Route path="/business-location" element={<OnboardingProvider><BusinessLocationPage /></OnboardingProvider>} />
    <Route path="/venue-location" element={<OnboardingProvider><VenueLocationPage /></OnboardingProvider>} />
    <Route path="/previous-software" element={<OnboardingProvider><PreviousSoftwarePage /></OnboardingProvider>} />
    <Route path="/recommendation-source" element={<OnboardingProvider><RecommendationSourcePage /></OnboardingProvider>} />
    <Route path="/setup-complete" element={<OnboardingProvider><SetupCompletePage /></OnboardingProvider>} />
    <Route path="/join-business" element={<OnboardingProvider><JoinBusinessPage /></OnboardingProvider>} />
  </Route>
)
