import { lazy } from "react";
import { Route } from "react-router-dom";

const PublicBookingPage = lazy(() => import("../features/booking-public/pages/PublicBookingPage"));
const ManageBookingPage = lazy(() => import("../features/booking-public/pages/ManageBookingPage"));

export const PublicBookingRoutes = (
  <>
    <Route path="/book/:slug/manage/:appointmentId" element={<ManageBookingPage />} />
    <Route path="/book/:slug" element={<PublicBookingPage />} />
  </>
);
