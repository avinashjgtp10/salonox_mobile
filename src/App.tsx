import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PageLoader } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes";
import { LandingRoutes } from "./routes/LandingRoutes";
import { SuperAdminRoutes } from "./routes/SuperAdminRoutes";
import SalonOxBot from './features/bot/SalonOxBot';
import SubscriptionWall from "./features/billing/components/SubscriptionWall";
import { useSubscriptionPoller } from "./hooks/useSubscriptionPoller";
import { useAppSelector } from "./hooks/useAppRedux";

function App() {
  const subscriptionExpired = useAppSelector((s) => s.billing.subscriptionExpired);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  useSubscriptionPoller();

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader fullHeight />}>
          <Routes>
            {/* PUBLIC — landing site */}
            {LandingRoutes}
            {/* AUTH */}
            {AuthRoutes}
            {OnboardingRoutes}
            {/* DASHBOARD (AuthGuard protected) */}
            {DashboardRoutes}
            {/* SUPER ADMIN (SuperAdminGuard protected) */}
            {SuperAdminRoutes}
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <SalonOxBot />
      {/* Full-screen subscription wall — renders over authenticated routes only */}
      {accessToken && subscriptionExpired && <SubscriptionWall />}
    </>
  );
}

export default App;
