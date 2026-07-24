import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { refreshSessionThunk } from "../../middleware/auth/authThunk";
import { logout } from "../../store/authSlice";

const GuestGuard = () => {
  const { accessToken: token, refreshToken, isOnboardingComplete, role } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();

  // accessToken isn't persisted, so on a fresh boot it starts null even when
  // a valid refreshToken exists in localStorage. Without this restore, landing
  // directly on /login always shows the login form regardless of session state.
  const [restoring, setRestoring] = useState(!token && !!refreshToken);

  useEffect(() => {
    if (!token && refreshToken) {
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
    } else if (isOnboardingComplete) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/business-name" replace />;
    }
  }

  return <Outlet />;
};

export default GuestGuard;
