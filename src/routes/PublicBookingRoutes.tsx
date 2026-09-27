import { lazy } from "react";
import { Route } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";

const PublicBookingPage = lazy(() => import("../features/booking-public/pages/PublicBookingPage"));
const ManageBookingPage = lazy(() => import("../features/booking-public/pages/ManageBookingPage"));

export const PublicBookingRoutes = (
  <>
    <Route
      path="/book/:slug/manage/:appointmentId"
      element={<PublicPageShell><ManageBookingPage /></PublicPageShell>}
    />
    <Route path="/book/:slug" element={<PublicPageShell><PublicBookingPage /></PublicPageShell>} />
  </>
);
