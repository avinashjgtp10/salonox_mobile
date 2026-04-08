import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../hooks/useAppRedux";

const GuestGuard = () => {
  const { accessToken: token, isOnboardingComplete } = useAppSelector(
    (state) => state.auth,
  );

  if (token) {
    if (isOnboardingComplete) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/account-type" replace />;
    }
  }

  return <Outlet />;
};

export default GuestGuard;
