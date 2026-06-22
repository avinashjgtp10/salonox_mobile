import { lazy } from "react";
import { Route } from "react-router-dom";

const LandingPage = lazy(() => import("../features/marketing-site/pages/landing"));

export const LandingRoutes = (
  <>
    <Route path="/" element={<LandingPage />} />
  </>
);
