import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux"
import { loginThunk } from "../../../middleware/auth/authThunk"
import salonImg from "../../../assets/images/salon.jpg"
import Card from "../../../components/ui/Card"
import Input from "../../../components/ui/Input"
import Button from "../../../components/ui/Button"
import { Divider } from "../../../components/ui/Divider"
import SplitLayout from "../../../components/ui/SplitLayout"

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function LoginPage() {
  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading: authLoading } = useAppSelector((state) => state.auth)
  const loading = authLoading.login

  // 🔐 LOGIN
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required")
      return
    }

    setError("")

    const result = await dispatch(loginThunk({ email, password }))

    if (loginThunk.fulfilled.match(result)) {
      const { isOnboardingComplete } = result.payload
      if (isOnboardingComplete) {
        navigate("/dashboard")
      } else {
        navigate("/account-type")
      }
    } else {
      setError((result.payload as string) ?? "Invalid email or password")
    }
  }

  // 🔐 GOOGLE OAUTH
  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_BASE_URL
    window.location.href = `${backendUrl}/api/v1/auth/google/start`
  }

  const LeftSection = (
    <Card
      className="login-card"
      style={{ width: "100%", maxWidth: "420px" }}
      title={
        <div className="text-center w-100 mb-2">
          <h4 className="brand-logo d-inline-block">salonox</h4>
          <h3 className="fw-bold mt-3 mb-2">Welcome</h3>
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
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />

      {error && <div className="alert alert-danger py-2 mt-2 mb-3">{error}</div>}

      {/* CONTINUE */}
      <Button
        variant="dark"
        fullWidth
        onClick={handleLogin}
        disabled={loading}
        className="mb-3"
      >
        Continue
      </Button>

      {/* FORGOT PASSWORD */}
      <div className="text-end mb-3">
        <span 
          onClick={() => navigate("/forgot-password")} 
          className="text-primary text-decoration-none" 
          style={{ cursor: "pointer", fontSize: "14px" }}
        >
          Forgot password?
        </span>
      </div>

      <Divider text="OR" />

      {/* GOOGLE */}
      <Button
        variant="outline-secondary"
        fullWidth
        onClick={handleGoogleLogin}
        iconLeft={<GoogleIcon size={20} />}
        disabled={loading}
        className="mb-2"
        style={{ height: "48px" }} // Added explicit height to match typical buttons
      >
        Continue with Google
      </Button>

      <p className="mt-1 mb-0" style={{ fontSize: "14px", color: "#6c757d" }}>
        Don't have an account?{" "}
        <span 
          onClick={() => navigate("/register")}
          className="text-primary text-decoration-none"
          style={{ cursor: "pointer" }}
        >
          Register
        </span>
      </p>
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
