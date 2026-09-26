import { lazy } from "react";
import { Route } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";

const PublicDigitalMenuPage = lazy(() => import("../features/digital-menu-public/pages/PublicDigitalMenuPage"));

export const DigitalMenuRoutes = (
  <Route path="/menu/:token" element={<PublicPageShell><PublicDigitalMenuPage /></PublicPageShell>} />
);
