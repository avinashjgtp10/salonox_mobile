import { useNavigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { useAppDispatch } from "../../../hooks/useAppRedux"
import { login, updateOnboardingStatus } from "../../../store/authSlice"
import "../styles/RequestSuccessPage.scss"

export default function RequestSuccessPage() {

  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useAppDispatch()

  const goToDashboard = () => {
    const state = location.state as { accessToken?: string; refreshToken?: string } | null

    if (state?.accessToken && state?.refreshToken) {
      dispatch(login({
        accessToken:          state.accessToken,
        refreshToken:         state.refreshToken,
        isOnboardingComplete: true,
      }))
    } else {
      dispatch(updateOnboardingStatus(true))
    }

    navigate("/dashboard", { replace: true })
  }

  // Auto-navigate after 3 seconds
  useEffect(() => {
    const timer = setTimeout(goToDashboard, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">

        <div className="check-circle mx-auto mb-4">
          ✓
        </div>

        <h2 className="fw-bold mb-2">
          Your request has been sent!
        </h2>

        <p className="text-muted mb-4">
          The business owner will review your request and notify you once approved.
        </p>

        <button
          className="btn btn-dark rounded-pill px-4"
          onClick={goToDashboard}
        >
          Done
        </button>

      </div>
    </div>
  )
}
