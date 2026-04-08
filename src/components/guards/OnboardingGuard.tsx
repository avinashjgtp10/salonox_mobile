import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../hooks/useAppRedux";

const OnboardingGuard = () => {
  const { accessToken, isOnboardingComplete } = useAppSelector(
    (state) => state.auth,
  );

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default OnboardingGuard;
