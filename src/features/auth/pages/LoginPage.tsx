import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { loginThunk } from "../../../middleware/auth/authThunk";
import salonImg from "../../../assets/images/salon.jpg";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Divider } from "../../../components/ui/Divider";
import SplitLayout from "../../../components/ui/SplitLayout";
import "../styles/LoginPage.scss";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading } = useAppSelector((state) => state.auth);
  const loading = authLoading.login;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    setError("");
    const result = await dispatch(loginThunk({ email, password }));
    if (loginThunk.fulfilled.match(result)) {
      const { isOnboardingComplete } = result.payload;
      if (isOnboardingComplete) {
        navigate("/dashboard");
      } else {
        navigate("/account-type");
      }
    } else {
      setError((result.payload as string) ?? "Invalid email or password");
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || "";
    window.location.href = `${backendUrl}/api/v1/auth/google/start`;
  };

  const LeftSection = (
    <div className="lp-wrap">
      <div className="lp-orb lp-orb--1" />
      <div className="lp-orb lp-orb--2" />

      <div className="lp-inner">
        <div className="lp-brand">
          <span className="lp-brand__gem" />
          salonox
        </div>

        <div className="lp-heading-block">
          <h1 className="lp-heading">Welcome<br />back.</h1>
          <p className="lp-sub">Sign in to manage your business.</p>
        </div>

        <div className="lp-form">
          <Input
            type="email"
            label="Email address"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            containerClass="lp-field"
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            containerClass="lp-field"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          {error && (
            <div className="lp-error">
              <span className="lp-error__icon">!</span>
              {error}
            </div>
          )}

          <div className="lp-forgot">
            <span onClick={() => navigate("/forgot-password")}>Forgot password?</span>
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
