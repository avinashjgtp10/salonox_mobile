import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"
import type { RootState } from "../../store/store"

const GuestGuard = () => {
  const { accessToken, isOnboardingComplete } = useSelector((state: RootState) => state.auth)

  if (accessToken) {
    if (isOnboardingComplete) {
      return <Navigate to="/dashboard" replace />
    } else {
      return <Navigate to="/account-type" replace />
    }
  }

  return <Outlet />
}

export default GuestGuard
