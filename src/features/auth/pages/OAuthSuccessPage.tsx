import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useDispatch } from "react-redux"
import { login } from "../../../store/authSlice"

/**
 * OAuthSuccessPage
 * ─────────────────
 * The backend redirects here after a successful Google sign-in:
 *   /oauth/success?token=ACCESS_TOKEN&refreshToken=REFRESH_TOKEN
 *
 * We read the token, persist it in Redux + localStorage, and
 * send the user on to the dashboard.
 */
export default function OAuthSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const accessToken = params.get("accessToken") || params.get("token")
    const refreshToken = params.get("refreshToken")
    const isOnboardingComplete = params.get("isOnboardingComplete") === "true"

    if (!accessToken) {
      alert("Google login failed: no token received.")
      navigate("/login")
      return
    }

    // Dispatch the tokens and status
    dispatch(login({ accessToken, refreshToken, isOnboardingComplete }))
    
    if (isOnboardingComplete) {
      navigate("/dashboard")
    } else {
      navigate("/account-type")
    }
  }, [])

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p className="text-muted">Signing you in with Google...</p>
      </div>
    </div>
  )
}
