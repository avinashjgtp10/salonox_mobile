import "../styles/LoginPage.scss"
import "bootstrap/dist/css/bootstrap.min.css"

import { FcGoogle } from "react-icons/fc"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { login } from "../../../store/authSlice"
import salonImg from "../../../assets/images/salon.jpg"
import API from "../../../services/api/axios"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  // 🔐 LOGIN
  const handleLogin = async () => {
    if (loading) return

    setError("")
    setLoading(true)

    try {
      const res = await API.post("/api/v1/auth/login", { email, password })
      const accessToken = res.data?.data?.accessToken
      const refreshToken = res.data?.data?.refreshToken

      if (!accessToken || !refreshToken) throw new Error("Tokens not found")

      dispatch(login({ accessToken, refreshToken }))
      navigate("/dashboard")
    } catch (err: any) {
      setError("Invalid email or password")
    }

    setLoading(false)
  }

  // 🔐 SOCIAL LOGIN (Demo) - Only Google
  const handleGoogleLogin = () => {
    const payload = {
      email: "google@oauth.com",
      role: "google",
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    }

    const fakeToken = "header." + btoa(JSON.stringify(payload)) + ".signature"
    dispatch(login({ accessToken: fakeToken, refreshToken: "fake-refresh-token" }))
    navigate("/dashboard")
  }

  return (
    <div className="container-fluid vh-100 login-page-bg">
      <div className="row h-100 g-0">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-md-6 col-12 d-flex align-items-center justify-content-center">
          <div className="card border-0 shadow-lg p-4 rounded-4 login-card" style={{ width: "100%", maxWidth: "420px" }}>

            <h3 className="fw-bold mb-2">Welcome Back</h3>
            <p className="text-muted mb-4">
              Create an account or log in to manage your business.
            </p>

            {/* EMAIL */}
            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
              />
              <label htmlFor="email">Email address</label>
            </div>

            {/* PASSWORD */}
            <div className="form-floating mb-2">
              <input
                type="password"
                className="form-control"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
              />
              <label htmlFor="password">Password</label>
            </div>

            {error && <div className="alert alert-danger py-2 mt-2 mb-3">{error}</div>}

            {/* CONTINUE */}
            <button
              className="btn btn-dark w-100 rounded-pill mb-3 d-flex align-items-center justify-content-center"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
              {loading ? "Checking..." : "Continue"}
            </button>

            {/* REGISTER */}
            <p className="text-center mb-3">
              <small className="text-muted">
                Don’t have an account?{" "}
                <span className="fw-bold text-decoration-underline register-link"
                  onClick={() => navigate("/register")}
                >
                  Register
                </span>
              </small>
            </p>

            {/* DIVIDER */}
            <div className="d-flex align-items-center my-3">
              <div className="flex-grow-1 divider-line"></div>
              <small className="px-3 text-muted">OR</small>
              <div className="flex-grow-1 divider-line"></div>
            </div>

            {/* GOOGLE */}
            <button
              className="btn btn-outline-secondary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 google-btn"
              onClick={handleGoogleLogin}
              type="button"
            >
              <FcGoogle />
              Continue with Google
            </button>

          </div>
        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="col-lg-7 d-none d-lg-block position-relative p-0 login-right">
          <img src={salonImg} alt="salon" className="w-100 h-100 right-image" />
          <div className="right-overlay"></div>
        </div>

      </div>
    </div>
  )
}