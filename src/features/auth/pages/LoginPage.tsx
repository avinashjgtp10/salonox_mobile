import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { FcGoogle } from "react-icons/fc"

import { login } from "../../../store/authSlice"
import salonImg from "../../../assets/images/salon.jpg"
import API from "../../../services/api/axios"
import { hashPassword } from "../../../utils/hashPassword"

// UI Components
import Card from "../../../components/ui/Card"
import Input from "../../../components/ui/Input"
import Button from "../../../components/ui/Button"
import { Divider } from "../../../components/ui/Divider"
import SplitLayout from "../../../components/ui/SplitLayout"

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
      const hashedPwd = await hashPassword(password)
      const res = await API.post("/api/v1/auth/login", { email, password: hashedPwd })
      const { accessToken, refreshToken, isOnboardingComplete } = res.data?.data || {}

      if (!accessToken) throw new Error("Token not found")

      dispatch(login({ accessToken, refreshToken, isOnboardingComplete }))

      if (isOnboardingComplete) {
        navigate("/dashboard")
      } else {
        navigate("/account-type")
      }
    } catch (err: any) {
      setError("Invalid email or password")
    }

    setLoading(false)
  }

  // 🔐 GOOGLE OAUTH
  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://192.168.0.201:3000"
    window.location.href = `${backendUrl}/api/v1/auth/google/start`
  }

  const LeftSection = (
    <Card
      className="login-card"
      style={{ width: "100%", maxWidth: "420px" }}
      title={
        <div className="text-center w-100 mb-2">
          <h4 className="brand-logo d-inline-block">salonox</h4>
          <h3 className="fw-bold mt-3 mb-2">Welcome Back</h3>
        </div>
      }
      subtitle="Create an account or log in to manage your business."
    >
      {/* EMAIL */}
      <Input
        type="email"
        label="Email address"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setError("")
        }}
        floating
      />

      {/* PASSWORD */}
      <Input
        type="password"
        label="Password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setError("")
        }}
        floating
        containerClass="mb-2"
      />

      {error && <div className="alert alert-danger py-2 mt-2 mb-3">{error}</div>}

      {/* CONTINUE */}
      <Button
        variant="dark"
        fullWidth
        onClick={handleLogin}
        loading={loading}
        className="mb-3"
      >
        Continue
      </Button>

      {/* REGISTER */}
      <p className="text-center mb-3">
        <small className="text-muted">
          Don’t have an account?{" "}
          <span className="fw-bold text-decoration-underline register-link"
            onClick={() => navigate("/register")}
            style={{ cursor: "pointer", color: "#6c63ff" }}
          >
            Register
          </span>
        </small>
      </p>

      <Divider text="OR" />

      {/* GOOGLE */}
      <Button
        variant="outline-secondary"
        fullWidth
        onClick={handleGoogleLogin}
        iconLeft={<FcGoogle size={20} />}
        disabled={loading}
      >
        Continue with Google
      </Button>
    </Card>
  )

  const RightSection = (
    <div className="w-100 h-100">
      <img
        src={salonImg}
        alt="salon"
        className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
        style={{ zIndex: 0 }}
      />
      <div className="right-overlay position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 1, backgroundColor: "rgba(0,0,0,0.1)" }}></div>
    </div>
  )

  return (
    <SplitLayout
      leftContent={LeftSection}
      rightContent={RightSection}
      className="login-page-bg"
    />
  )
}
