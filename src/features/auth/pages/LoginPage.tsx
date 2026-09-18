import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { loginThunk } from "../../../middleware/auth/authThunk";
import { API_ORIGIN } from "../../../services/api/baseUrl";
import salonImg from "../../../assets/images/dashboard-hero.jpg.png";
import salonoxLogo from "../../../assets/salonox_full_logo.png";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Divider } from "../../../components/ui/Divider";
import SplitLayout from "../../../components/ui/SplitLayout";
import "../styles/LoginPage.scss";

export default function LoginPage() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading } = useAppSelector((state) => state.auth);
  const loading = authLoading.login;

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name: "email" | "password", value: string): string => {
    if (name === "email") {
      if (!value.trim()) return "Email address is required";
      if (!emailRx.test(value)) return "Please enter a valid email address";
    }
    if (name === "password") {
      if (!value.trim()) return "Password is required";
    }
    return "";
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (submitted) {
      const msg = validateField("email", value);
      setErrors(prev => ({ ...prev, email: msg || undefined, api: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const msg = submitted ? validateField("password", value) : "";
    setErrors(prev => ({ ...prev, password: msg || undefined, api: undefined }));
  };

  const handleLogin = async () => {
    setSubmitted(true);
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    if (emailErr || passwordErr) {
      setErrors({ email: emailErr || undefined, password: passwordErr || undefined });
      const firstErrorId = emailErr ? "lp-email" : "lp-password";
      const el = document.getElementById(firstErrorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }
    setErrors({});
    const result = await dispatch(loginThunk({ email, password }));
    if (loginThunk.fulfilled.match(result)) {
      const { isOnboardingComplete, user } = result.payload;
      if (user?.role === "super_admin") {
        navigate("/super-admin");
      } else if (user?.role === "branch_owner") {
        navigate("/branch-owner");
      } else if (user?.role === "staff" || isOnboardingComplete) {
        navigate("/dashboard");
      } else {
        navigate("/business-name");
      }
    } else {
      setErrors({ api: "Invalid credentials." });
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_ORIGIN}/api/v1/auth/google/start`;
  };

  const LeftSection = (
    <div className="lp-wrap">
      <div className="lp-orb lp-orb--1" />
      <div className="lp-orb lp-orb--2" />

      <div className="lp-inner">
        <div className="lp-brand">
          <img src={salonoxLogo} alt="SalonOX" className="lp-brand__logo" width="210" height="68" />
        </div>

        <div className="lp-heading-block">
          <h1 className="lp-heading whitespace-nowrap">Welcome back.</h1>
          <p className="lp-sub">Sign in to manage your business.</p>
        </div>

        <div className="lp-form">
          <Input
            id="lp-email"
            type="email"
            label={<>Email address <span style={{ color: "#E05C5C", fontWeight: 700 }}>*</span></>}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            error={errors.email}
            containerClass="lp-field"
          />

          <Input
            id="lp-password"
            type={showPassword ? "text" : "password"}
            label={<>Password <span style={{ color: "#E05C5C", fontWeight: 700 }}>*</span></>}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            error={errors.password || errors.api}
            containerClass="lp-field"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center" }}
              >
                {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
              </button>
            }
          />

          <div className="flex items-center justify-between w-full mb-5" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", width: "100%" }}>
            <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center" }}>
              <input type="checkbox" id="rememberMe" className="w-4 h-4 cursor-pointer accent-black" style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "black", marginRight: "8px", margin: 0 }} />
              <label htmlFor="rememberMe" className="text-sm cursor-pointer text-gray-500 font-medium" style={{ fontSize: "13px", color: "#7A7672", cursor: "pointer", fontWeight: 500, margin: 0 }}>Remember me</label>
            </div>
            <div className="lp-forgot" style={{ marginBottom: 0 }}>
              <span className="text-black cursor-pointer font-medium" style={{ color: "black" }} onClick={() => navigate("/forgot-password")}>Forgot password?</span>
            </div>
          </div>

          <Button
            variant="dark"
            fullWidth
            onClick={handleLogin}
            loading={loading}
            className="lp-btn-primary"
          >
            Continue
          </Button>

          <Divider text="OR" />

          <Button
            variant="outline-secondary"
            fullWidth
            onClick={handleGoogleLogin}
            iconLeft={<FcGoogle size={20} />}
            disabled={loading}
            className="lp-btn-google"
          >
            Continue with Google
          </Button>

          <p className="lp-register-link">
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")}>Register</span>
          </p>
        </div>
      </div>
    </div>
  );

  const RightSection = (
    <div className="lp-right">
      <img src={salonImg} alt="salon" className="lp-right__img" />
    </div>
  );

  return (
    <SplitLayout
      leftContent={LeftSection}
      rightContent={RightSection}
      className="lp-root"
    />
  );
}
