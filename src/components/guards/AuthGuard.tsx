import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux"
import { getMySalonThunk } from "../../middleware/salon/salon.thunk"
import { updateOnboardingStatus } from "../../store/authSlice"

const AuthGuard = () => {
  const { accessToken: token, isOnboardingComplete } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const [checking, setChecking] = useState(!isOnboardingComplete && !!token)
  const [verified, setVerified] = useState(isOnboardingComplete)

  useEffect(() => {
    // If localStorage says false but user has a token, verify against the server
    // (handles stale state after backend fix)
    if (!isOnboardingComplete && token) {
      dispatch(getMySalonThunk())
        .unwrap()
        .then((salon) => {
          const done = !!(salon?.onboarding_completed)
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
    } else {
        setChecking(false)
    }
  }, [dispatch, isOnboardingComplete, token])

  if (!token) {
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
