// @refresh reset
import { lazy } from "react"
import { Route } from "react-router-dom"
import { OnboardingProvider } from "../context/OnboardingContext"
import OnboardingGuard from "../components/guards/OnboardingGuard"

const AccountTypePage       = lazy(() => import("../features/auth/pages/AccountTypePage"))
const BusinessNamePage      = lazy(() => import("../features/auth/pages/BusinessNamePage"))
const ServiceTypePage       = lazy(() => import("../features/auth/pages/ServiceTypePage"))
const TeamSetupPage         = lazy(() => import("../features/auth/pages/TeamSetupPage"))
const BusinessLocationPage  = lazy(() => import("../features/auth/pages/BusinessLocationPage"))
const VenueLocationPage     = lazy(() => import("../features/auth/pages/VenueLocationPage"))
const PreviousSoftwarePage  = lazy(() => import("../features/auth/pages/PreviousSoftwarePage"))
const RecommendationSourcePage = lazy(() => import("../features/auth/pages/RecommendationSourcePage"))
const SetupCompletePage     = lazy(() => import("../features/auth/pages/SetupCompletePage"))
const JoinBusinessPage      = lazy(() => import("../features/auth/pages/JoinBusinessPage"))
const TeamSizePage          = lazy(() => import("../features/auth/pages/TeamSizePage"))

export const OnboardingRoutes = (
  <Route element={<OnboardingGuard />}>
    <Route path="/account-type"         element={<OnboardingProvider><AccountTypePage /></OnboardingProvider>} />
    <Route path="/business-name"        element={<OnboardingProvider><BusinessNamePage /></OnboardingProvider>} />
    <Route path="/service-type"         element={<OnboardingProvider><ServiceTypePage /></OnboardingProvider>} />
    <Route path="/team-setup"           element={<OnboardingProvider><TeamSetupPage /></OnboardingProvider>} />
    <Route path="/team-size"            element={<OnboardingProvider><TeamSizePage /></OnboardingProvider>} />
    <Route path="/business-location"    element={<OnboardingProvider><BusinessLocationPage /></OnboardingProvider>} />
    <Route path="/venue-location"       element={<OnboardingProvider><VenueLocationPage /></OnboardingProvider>} />
    <Route path="/previous-software"   element={<OnboardingProvider><PreviousSoftwarePage /></OnboardingProvider>} />
    <Route path="/recommendation-source" element={<OnboardingProvider><RecommendationSourcePage /></OnboardingProvider>} />
    <Route path="/setup-complete"       element={<OnboardingProvider><SetupCompletePage /></OnboardingProvider>} />
    <Route path="/join-business"        element={<OnboardingProvider><JoinBusinessPage /></OnboardingProvider>} />
  </Route>
)

