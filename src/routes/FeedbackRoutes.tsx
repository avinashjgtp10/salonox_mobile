import { lazy } from "react";
import { Route } from "react-router-dom";

const FeedbackFormPage = lazy(() => import("../features/feedback/pages/FeedbackFormPage"));

export const FeedbackRoutes = (
  <>
    <Route path="/feedback/:slug" element={<FeedbackFormPage />} />
  </>
);
