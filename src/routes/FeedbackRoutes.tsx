import { lazy } from "react";
import { Route } from "react-router-dom";
import { isFeedbackHost } from "../utils/hostname";

const FeedbackFormPage = lazy(() => import("../features/feedback/pages/FeedbackFormPage"));

export const FeedbackRoutes = (
  <>
    {isFeedbackHost && <Route path="/" element={<FeedbackFormPage />} />}
    <Route path="/feedback/:slug" element={<FeedbackFormPage />} />
  </>
);
