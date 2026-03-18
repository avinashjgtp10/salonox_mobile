import { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Navigate, Outlet } from "react-router-dom"
import type { RootState } from "../../store/store"
import { salonApi } from "../../services/api/salon.api"
import { updateOnboardingStatus } from "../../store/authSlice"

const AuthGuard = () => {
  const { accessToken, isOnboardingComplete } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const [checking, setChecking] = useState(!isOnboardingComplete && !!accessToken)
  const [verified, setVerified] = useState(isOnboardingComplete)

  useEffect(() => {
    // If localStorage says false but user has a token, verify against the server
    // (handles stale state after backend fix)
    if (!isOnboardingComplete && accessToken) {
      salonApi.getMySalon()
        .then((res) => {
          const done = !!(res?.data?.onboarding_completed)
          if (done) {
            dispatch(updateOnboardingStatus(true))
          }
          setVerified(done)
        })
        .catch(() => {
          setVerified(false)
        })
        .finally(() => {
          setChecking(false)
        })
    }
  }, [])

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (checking) {
    return null // Brief loading pause while we verify
  }

  if (!verified) {
    return <Navigate to="/account-type" replace />
  }

  return <Outlet />
}

export default AuthGuard

