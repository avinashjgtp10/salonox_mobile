import { Route } from "react-router-dom"
import LoginPage from "../features/auth/pages/LoginPage"
import RegisterPage from "../features/auth/pages/RegisterPage"
import OAuthSuccessPage from "../features/auth/pages/OAuthSuccessPage"
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage"
import SendRequestPage from "../features/auth/pages/SendRequestPage"
import RequestSuccessPage from "../features/auth/pages/RequestSuccessPage"
import GuestGuard from "../components/guards/GuestGuard"

export const AuthRoutes = (
  <>
    <Route path="/send-request" element={<SendRequestPage />} />
    <Route path="/request-success" element={<RequestSuccessPage />} />
    <Route element={<GuestGuard />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/oauth-success" element={<OAuthSuccessPage />} />
      <Route path="/oauth/success" element={<OAuthSuccessPage />} />
    </Route>
  </>
)
