import { Suspense, createContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PageLoader } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes";
import { LandingRoutes } from "./routes/LandingRoutes";
import { SuperAdminRoutes } from "./routes/SuperAdminRoutes";
import { PublicBookingRoutes } from "./routes/PublicBookingRoutes";
import { FeedbackRoutes } from "./routes/FeedbackRoutes";
import SalonOxBot from './features/bot/SalonOxBot';
import SubscriptionWall from "./features/billing/components/SubscriptionWall";
import { useSubscriptionPoller } from "./hooks/useSubscriptionPoller";
import { useAppSelector } from "./hooks/useAppRedux";

// Lets any descendant (billing pages, SubscriptionWall) trigger an
// immediate subscription re-check — e.g. after cancel/renew/upgrade —
// without prop-drilling through the route tree.
export const SubscriptionRefreshContext = createContext<() => void>(() => {});

function App() {
  const subscriptionExpired = useAppSelector((s) => s.billing.subscriptionExpired);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const role = useAppSelector((s) => s.auth.role);
  const { refreshNow } = useSubscriptionPoller();

  return (
    <SubscriptionRefreshContext.Provider value={refreshNow}>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader fullHeight />}>
          <Routes>
            {/* PUBLIC — landing site */}
            {LandingRoutes}
            {/* PUBLIC — client-facing booking pages */}
            {PublicBookingRoutes}
            {/* PUBLIC — client-facing post-visit feedback form */}
            {FeedbackRoutes}
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
    </SubscriptionRefreshContext.Provider>
  );
}

export default App;
