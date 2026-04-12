import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { getMySalonThunk } from "../../middleware/salon/salon.thunk";
import { updateOnboardingStatus } from "../../store/authSlice";

const OnboardingGuard = () => {
  const { accessToken, isOnboardingComplete } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const [checking, setChecking] = useState(!isOnboardingComplete && !!accessToken);

  useEffect(() => {
    if (!isOnboardingComplete && accessToken) {
      dispatch(getMySalonThunk())
        .unwrap()
        .then((salon) => {
          const done = !!salon?.onboarding_completed;
          if (done) {
            dispatch(updateOnboardingStatus(true));
          }
        })
        .catch(() => {
            // handle error to prevent unhandled rejection
        })
        .finally(() => {
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, [dispatch, isOnboardingComplete, accessToken]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (checking) {
    return null; // Brief loading pause while verifying
  }

  if (isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default OnboardingGuard;
