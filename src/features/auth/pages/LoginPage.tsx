import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { loginThunk } from "../../../middleware/auth/authThunk";
import { API_ORIGIN } from "../../../services/api/baseUrl";
import salonImg from "../../../assets/images/salon.jpg";
import salonoxLogo from "../../../assets/salonox_logo_black.svg";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Divider } from "../../../components/ui/Divider";
import SplitLayout from "../../../components/ui/SplitLayout";
import "../styles/LoginPage.scss";

export default function LoginPage() {
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
      const { isOnboardingComplete } = result.payload;
      if (isOnboardingComplete) {
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
          <img src={salonoxLogo} alt="SalonOx" className="lp-brand__logo" width="124" height="40" />
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

          <div className="flex items-center justify-between w-full mb-5" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", width: "100%" }}>
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
      <div className="lp-right__overlay" />

      <div className="lp-particles">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className={`lp-particle lp-particle--${i + 1}`} />
        ))}
      </div>

      <div className="lp-right__content">
        <div className="lp-badge">
          <span className="lp-badge__dot" />
          Trusted by 10,000+ salons across India
        </div>

        <div className="lp-testimonial">
          <div className="lp-testimonial__stars">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#C9A96E">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            ))}
          </div>
          <blockquote className="lp-testimonial__quote">
            "salonox transformed how I run my salon. Bookings, billing, staff — all in one place."
          </blockquote>
          <cite className="lp-testimonial__author">
            <span className="lp-testimonial__name">Priya Sharma</span>
            <span className="lp-testimonial__role">Founder, Studio Luxe · Mumbai</span>
          </cite>
        </div>

        <div className="lp-stats">
          <div className="lp-stat">
            <span className="lp-stat__val">10K+</span>
            <span className="lp-stat__label">Professionals</span>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <span className="lp-stat__val">4.9★</span>
            <span className="lp-stat__label">Rating</span>
          </div>
          <div className="lp-stat-div" />
          <div className="lp-stat">
            <span className="lp-stat__val">Free</span>
            <span className="lp-stat__label">7-day trial</span>
          </div>
        </div>
      </div>
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
