import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { getMySalonThunk } from "../../middleware/salon/salon.thunk";
import { updateOnboardingStatus, logout } from "../../store/authSlice";
import { refreshSessionThunk } from "../../middleware/auth/authThunk";

const AuthGuard = () => {
  const { accessToken, refreshToken, isOnboardingComplete } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();

  // ── Phase 1: silent session restore ────────────────────────────────────────
  // accessToken is no longer persisted to localStorage.
  // On every app boot it starts as null. If a refreshToken exists we silently
  // exchange it for a new accessToken before any route renders.
  const [restoring, setRestoring] = useState(!accessToken && !!refreshToken);

  // ── Phase 2: onboarding verification (same as before) ──────────────────────
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(isOnboardingComplete);

  // Phase 1 effect — runs once on mount
  useEffect(() => {
    if (!accessToken && refreshToken) {
      dispatch(refreshSessionThunk())
        .unwrap()
        .catch(() => {
          // Refresh token is expired/invalid — clear everything and send to login
          dispatch(logout());
        })
        .finally(() => {
          setRestoring(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run on mount

  // Phase 2 effect — runs after restore completes and we have an accessToken
  useEffect(() => {
    if (restoring) return; // wait until phase 1 finishes
    if (!accessToken) return; // will redirect to /login below

    if (!isOnboardingComplete) {
      setChecking(true);
      dispatch(getMySalonThunk())
        .unwrap()
        .then((salon) => {
          const done = !!salon?.onboarding_completed;
          if (done) dispatch(updateOnboardingStatus(true));
          setVerified(done);
        })
        .catch(() => {
          setVerified(false);
        })
        .finally(() => {
          setChecking(false);
        });
    } else {
      setVerified(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring, accessToken]);

  // Waiting for session restore or onboarding check
  if (restoring || checking) return null;

  // No valid session at all
  if (!accessToken) return <Navigate to="/login" replace />;

  // Session valid but onboarding incomplete
  if (!verified) return <Navigate to="/account-type" replace />;

  return <Outlet />;
};

export default AuthGuard;
