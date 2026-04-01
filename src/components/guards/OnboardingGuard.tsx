import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"
import type { RootState } from "../../store/store"

const OnboardingGuard = () => {
  const { accessToken, isOnboardingComplete } = useSelector((state: RootState) => state.auth)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default OnboardingGuard
