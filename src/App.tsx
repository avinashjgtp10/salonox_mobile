import { Suspense, createContext, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PageLoader, AlertDialog } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes";
import { LandingRoutes } from "./routes/LandingRoutes";
import { SuperAdminRoutes } from "./routes/SuperAdminRoutes";
import { BranchOwnerRoutes } from "./routes/BranchOwnerRoutes";
import { PublicBookingRoutes } from "./routes/PublicBookingRoutes";
import { FeedbackRoutes } from "./routes/FeedbackRoutes";
import SalonOxBot from './features/bot/SalonOxBot';
import CallHelpButton from './features/bot/CallHelpButton';
import SubscriptionWall from "./features/billing/components/SubscriptionWall";
import { useSubscriptionPoller } from "./hooks/useSubscriptionPoller";
import { useAppSelector, useAppDispatch } from "./hooks/useAppRedux";
import { hidePermissionDenied } from "./store/permissionDialogSlice";

// Lets any descendant (billing pages, SubscriptionWall) trigger an
// immediate subscription re-check — e.g. after cancel/renew/upgrade —
// without prop-drilling through the route tree.
export const SubscriptionRefreshContext = createContext<() => void>(() => {});

function App() {
  const dispatch = useAppDispatch();
  const subscriptionExpired = useAppSelector((s) => s.billing.subscriptionExpired);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const role = useAppSelector((s) => s.auth.role);
  const permissionDialog = useAppSelector((s) => s.permissionDialog);
  const { refreshNow } = useSubscriptionPoller();
  const location = useLocation();

  // The dialog is global (rendered here, not tied to any one page), so
  // without this a denial hit on one page — then navigated away from
  // without clicking OK — kept showing on whatever page came next, looking
  // like a fresh denial on a totally unrelated action. Every route change
  // clears it; a new denial on the new page still reopens it normally.
  useEffect(() => {
    if (permissionDialog.open) dispatch(hidePermissionDenied());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
            {/* BRANCH OWNER (BranchOwnerGuard protected) */}
            {BranchOwnerRoutes}
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <SalonOxBot />
      <CallHelpButton />
      {/* Full-screen subscription wall — renders over authenticated routes only */}
      {accessToken && subscriptionExpired && <SubscriptionWall />}
      {/* Generic "Access Denied" popup — shown app-wide whenever any API call
          403s with a permission-denial message (see interceptors.ts), so
          every page gets the same popup instead of each needing its own
          toast/banner for this case. */}
      {permissionDialog.open && (
        <AlertDialog
          title="Permission Required"
          message={permissionDialog.message}
          onOk={() => dispatch(hidePermissionDenied())}
        />
      )}
    </SubscriptionRefreshContext.Provider>
  );
}

export default App;
