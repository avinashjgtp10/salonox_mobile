// @refresh reset
import { lazy } from "react";
import { Route } from "react-router-dom";
import GuestGuard from "../components/guards/GuestGuard";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage"));
const OAuthSuccessPage = lazy(
  () => import("../features/auth/pages/OAuthSuccessPage"),
);
const ForgotPasswordPage = lazy(
  () => import("../features/auth/pages/ForgotPasswordPage"),
);
const SendRequestPage = lazy(
  () => import("../features/auth/pages/SendRequestPage"),
);
const RequestSuccessPage = lazy(
  () => import("../features/auth/pages/RequestSuccessPage"),
);
const AcceptInvitePage = lazy(
  () => import("../features/auth/pages/AcceptInvitePage"),
);
const PrivacyPolicyPage = lazy(
  () => import("../features/auth/pages/PrivacyPolicyPage"),
);
const TermsOfServicePage = lazy(
  () => import("../features/auth/pages/TermsOfServicePage"),
);
const TermsOfBusinessPage = lazy(
  () => import("../features/auth/pages/TermsOfBusinessPage"),
);

export const AuthRoutes = (
  <>
    <Route path="/send-request" element={<SendRequestPage />} />
    <Route path="/request-success" element={<RequestSuccessPage />} />
    <Route path="/accept-invite" element={<AcceptInvitePage />} />
    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
    <Route path="/terms-of-service" element={<TermsOfServicePage />} />
    <Route path="/terms-of-business" element={<TermsOfBusinessPage />} />
    <Route element={<GuestGuard />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/oauth-success" element={<OAuthSuccessPage />} />
      <Route path="/oauth/success" element={<OAuthSuccessPage />} />
    </Route>
  </>
);
