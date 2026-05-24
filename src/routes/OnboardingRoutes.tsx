import { lazy } from "react";
import { Route } from "react-router-dom";
import { OnboardingProvider } from "../context/OnboardingContext";
import OnboardingGuard from "../components/guards/OnboardingGuard";
import OnboardingLayout from "../features/auth/components/OnboardingLayout";

const BusinessNamePage = lazy(
  () => import("../features/auth/pages/BusinessNamePage"),
);
const ServiceTypePage = lazy(
  () => import("../features/auth/pages/ServiceTypePage"),
);
const TeamSetupPage = lazy(
  () => import("../features/auth/pages/TeamSetupPage"),
);
const BusinessLocationPage = lazy(
  () => import("../features/auth/pages/BusinessLocationPage"),
);
const VenueLocationPage = lazy(
  () => import("../features/auth/pages/VenueLocationPage"),
);

const RecommendationSourcePage = lazy(
  () => import("../features/auth/pages/RecommendationSourcePage"),
);
const SetupCompletePage = lazy(
  () => import("../features/auth/pages/SetupCompletePage"),
);
const JoinBusinessPage = lazy(
  () => import("../features/auth/pages/JoinBusinessPage"),
);
const TeamSizePage = lazy(() => import("../features/auth/pages/TeamSizePage"));

export const OnboardingRoutes = (
  <Route element={<OnboardingGuard />}>
    <Route
      element={
        <OnboardingProvider>
          <OnboardingLayout />
        </OnboardingProvider>
      }
    >
      <Route path="/business-name" element={<BusinessNamePage />} />
      <Route path="/service-type" element={<ServiceTypePage />} />
      <Route path="/team-setup" element={<TeamSetupPage />} />
      <Route path="/team-size" element={<TeamSizePage />} />
      <Route path="/business-location" element={<BusinessLocationPage />} />
      <Route path="/venue-location" element={<VenueLocationPage />} />

      <Route
        path="/recommendation-source"
        element={<RecommendationSourcePage />}
      />
      <Route path="/setup-complete" element={<SetupCompletePage />} />
      <Route path="/join-business" element={<JoinBusinessPage />} />
    </Route>
  </Route>
);
