import { lazy } from "react";
import { Route } from "react-router-dom";
import { isFeedbackHost } from "../utils/hostname";

const LandingPage = lazy(() => import("../features/marketing-site/pages/landing"));

export const LandingRoutes = (
  <>
    {!isFeedbackHost && <Route path="/" element={<LandingPage />} />}
    <Route path="/terms" element={<LandingPage />} />
    <Route path="/privacy" element={<LandingPage />} />
    <Route path="/about" element={<LandingPage />} />
  </>
);
