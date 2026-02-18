import "./LoginPage.scss"
import { FaFacebookF, FaApple } from "react-icons/fa"
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

  // 🔐 LOGIN FUNCTION
  const handleLogin = async () => {

    if (loading) return

    setError("")
    setLoading(true)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Email validation
    if (!emailRegex.test(email)) {
      setError("Enter valid email address")
      setLoading(false)
      return
    }

    // Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const res = await API.post("/login", {
        email,
        password
      })

      const token = res.data.token

      dispatch(login(token)) // JWT goes to Redux
      navigate("/dashboard")

    } catch (err: any) {
      setError("Invalid email or password")
    }

    setLoading(false)
  }

  // 🔐 SOCIAL LOGIN (Demo)
  const handleSocialLogin = (provider: string) => {

    const payload = {
      email: provider + "@oauth.com",
      role: provider,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    }

    const fakeToken =
      "header." +
      btoa(JSON.stringify(payload)) +
      ".signature"

    dispatch(login(fakeToken))
    navigate("/dashboard")
  }

  return (
    <div className="login-container">

      {/* LEFT SIDE */}
      <div className="login-left">


        <p className="subtitle">
          Create an account or log in to manage your business.
        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Enter your email address"
          className="input"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError("")
          }}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Enter your password"
          className="input"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError("")
          }}
        />

        {error && <p className="error">{error}</p>}

        {/* CONTINUE BUTTON */}
        <button
          className="continue-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Checking..." : "Continue"}
        </button>

        {/* 🔥 REGISTER TEXT (CORRECT POSITION) */}
        <p className="register-text">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="register-link"
          >
            Register
          </span>
        </p>

        {/* DIVIDER */}
        <div className="divider"><span>OR</span></div>

        {/* SOCIAL LOGIN */}
        <button
          className="social-btn facebook"
          onClick={() => handleSocialLogin("facebook")}
        >
          <FaFacebookF className="icon" />
          Continue with Facebook
        </button>

        <button
          className="social-btn google"
          onClick={() => handleSocialLogin("google")}
        >
          <FcGoogle className="icon" />
          Continue with Google
        </button>

        <button
          className="social-btn apple"
          onClick={() => handleSocialLogin("apple")}
        >
          <FaApple className="icon" />
          Continue with Apple
        </button>

      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="login-right">
        <img src={salonImg} alt="salon" className="right-image" />
      </div>

    </div>
  )
}
