import { useSelector } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"
import type { RootState } from "../../store/store"

const GuestGuard = () => {
  const { token, isOnboardingComplete } = useSelector((state: any) => state.auth)

  if (token) {
    if (isOnboardingComplete) {
      return <Navigate to="/dashboard" replace />
    } else {
      return <Navigate to="/account-type" replace />
    }
  }

  return <Outlet />
}

export default GuestGuard
