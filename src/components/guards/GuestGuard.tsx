import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { refreshSessionThunk } from "../../middleware/auth/authThunk";
import { logout } from "../../store/authSlice";

const GuestGuard = () => {
  const { accessToken: token, refreshToken, isOnboardingComplete, role, impersonatedBy } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const location = useLocation();

  // /oauth/success carries its own token in the URL (used by both the normal
  // Google-login flow and the branch-owner "Enter Salon" flow) — that page
  // authenticates itself. If we also restore a session here from a stale
  // refreshToken already in localStorage (e.g. the branch owner's own login,
  // shared across tabs on the same origin), that restore wins the race and
  // hijacks the session before the URL's token is ever read, landing the
  // user back in their old account's onboarding state instead.
  const isOAuthSuccessRoute = location.pathname.startsWith("/oauth/success") || location.pathname.startsWith("/oauth-success");

  // accessToken isn't persisted, so on a fresh boot it starts null even when
  // a valid refreshToken exists in localStorage. Without this restore, landing
  // directly on /login always shows the login form regardless of session state.
  const [restoring, setRestoring] = useState(!isOAuthSuccessRoute && !token && !!refreshToken);

  useEffect(() => {
    if (!isOAuthSuccessRoute && !token && refreshToken) {
      dispatch(refreshSessionThunk())
        .unwrap()
        .catch(() => {
          dispatch(logout());
        })
        .finally(() => {
          setRestoring(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restoring) return null;

  if (token) {
    // Super admins never go through salon onboarding — send them straight to
    // the super admin panel, not /dashboard or /business-name. Without this
    // check, GuestGuard re-renders the instant loginThunk sets accessToken
    // (before LoginPage's own navigate("/super-admin") call lands) and races
    // it to /dashboard instead, since it only ever looked at
    // isOnboardingComplete.
    if (role === "super_admin") {
      return <Navigate to="/super-admin" replace />;
    } else if (role === "branch_owner") {
      // Branch owners never go through salon onboarding — without this
      // check they fall through to the isOnboardingComplete branch below,
      // which is false for a branch owner (that flag is salon-owner-only),
      // sending a super-admin "Impersonate" straight into /business-name
      // instead of the branch owner's own dashboard.
      return <Navigate to="/branch-owner" replace />;
    } else if (isOnboardingComplete || impersonatedBy === "branch_owner") {
      // Branch-owner-entered salons are always already onboarded.
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/business-name" replace />;
    }
  }

  return <Outlet />;
};

export default GuestGuard;
