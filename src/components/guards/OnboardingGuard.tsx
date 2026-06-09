import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { getMySalonThunk } from "../../middleware/salon/salon.thunk";
import { updateOnboardingStatus } from "../../store/authSlice";

const OnboardingGuard = () => {
  const { accessToken, isOnboardingComplete, role } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const isStaff = role === "staff";
  const [checking, setChecking] = useState(!isOnboardingComplete && !isStaff && !!accessToken);

  useEffect(() => {
    if (!isOnboardingComplete && !isStaff && accessToken) {
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

  if (isOnboardingComplete || isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default OnboardingGuard;
