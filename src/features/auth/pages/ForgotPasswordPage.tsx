import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  forgotPasswordSendOtpThunk,
  forgotPasswordVerifyOtpThunk,
  forgotPasswordResetThunk,
} from "../../../middleware/auth/forgotPasswordThunk";
import { clearError } from "../../../store/authSlice";

import SplitLayout from "../../../components/ui/SplitLayout";
import Button from "../../../components/ui/Button";
import salonImg from "../../../assets/images/salon.jpg";
import "../styles/ForgotPasswordPage.scss";

const STEPS = { EMAIL: 1, OTP: 2, RESET: 3, SUCCESS: 4 };

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading, error: reduxError } = useAppSelector(s => s.auth);

  const [step, setStep] = useState(STEPS.EMAIL);
  const loading =
    step === STEPS.EMAIL ? authLoading.forgotSendOtp :
      step === STEPS.OTP ? authLoading.forgotVerifyOtp :
        step === STEPS.RESET ? authLoading.forgotReset : false;

  const [localError, setLocalError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [newPwError, setNewPwError] = useState("");
  const [confirmPwError, setConfirmPwError] = useState("");
  const error = localError || reduxError;

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLocalError("");
    setNewPwError("");
    setConfirmPwError("");
    dispatch(clearError());
  }, [step, dispatch]);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timeLeft]);

  const handleNext = async () => {
    setLocalError("");
    dispatch(clearError());

    if (step === STEPS.EMAIL) {
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) { setLocalError("Email address is required."); return; }
      if (!emailRx.test(email)) { setLocalError("Please enter a valid email address."); return; }
      const result = await dispatch(forgotPasswordSendOtpThunk({ email }));
      if (forgotPasswordSendOtpThunk.fulfilled.match(result)) {
        setOtp(["", "", "", "", "", ""]);
        setTimeLeft(60);
        setStep(STEPS.OTP);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } else if (step === STEPS.OTP) {
      const otpString = otp.join("");
      if (otpString.length !== 6) { setLocalError("Please enter the complete 6-digit code."); return; }
      const result = await dispatch(forgotPasswordVerifyOtpThunk({ email, otp: otpString }));
      if (forgotPasswordVerifyOtpThunk.fulfilled.match(result)) setStep(STEPS.RESET);
    } else if (step === STEPS.RESET) {
      const pwInvalid = !newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword);
      const pwMismatch = newPassword !== confirmPassword;
      setNewPwError(pwInvalid ? "Password must be 8+ characters with a letter and number." : "");
      setConfirmPwError(pwMismatch ? "Passwords do not match." : "");
      if (pwInvalid || pwMismatch) return;
      const result = await dispatch(forgotPasswordResetThunk({ email, otp: otp.join(""), rawPassword: newPassword }));
      if (forgotPasswordResetThunk.fulfilled.match(result)) setStep(STEPS.SUCCESS);
    }
  };

  const handleBack = () => {
    if (step === STEPS.OTP || step === STEPS.RESET) setStep(step - 1);
    else navigate("/login");
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    setIsResending(true);
    const result = await dispatch(forgotPasswordSendOtpThunk({ email }));
    setIsResending(false);
    if (forgotPasswordSendOtpThunk.fulfilled.match(result)) {
      setOtp(["", "", "", "", "", ""]);
      setTimeLeft(60);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.charAt(value.length - 1);
    if (!/^[0-9]*$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;
    const next = [...otp];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const renderContent = () => {
    if (step === STEPS.EMAIL) return (
      <>
        <div className="fp-heading-block">
          <h1 className="fp-heading">Forgot password?</h1>
          <p className="fp-sub">Enter your email and we'll send you a 6-digit reset code.</p>
        </div>

        <div className="fp-field">
          <label className="fp-label">Email address <span className="fp-required">*</span></label>
          <input
            id="fp-email"
            type="email"
            className={`fp-input${error ? " fp-input--error" : ""}`}
            placeholder="name@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setLocalError(""); dispatch(clearError()); }}
            onKeyDown={e => e.key === "Enter" && handleNext()}
            autoFocus
          />
          {error && <span className="fp-error-msg">{error}</span>}
        </div>

        <button className="fp-btn-primary" onClick={handleNext} disabled={!!loading}>
          {loading ? "Sending…" : "Send reset code"}
        </button>

        <div className="fp-back-link">
          <button onClick={() => navigate("/login")}>
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </>
    );

    if (step === STEPS.OTP) return (
      <>
        <div className="fp-heading-block">
          <h1 className="fp-heading">Check your email</h1>
          <p className="fp-sub">We sent a 6-digit code to <strong>{email}</strong>.</p>
        </div>

        <div className="fp-otp-group">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { otpRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              className={`fp-otp-box${digit ? " fp-otp-box--filled" : ""}`}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
              onPaste={handleOtpPaste}
              autoComplete="off"
            />
          ))}
        </div>

        {error && <span className="fp-error-msg fp-error-msg--center">{error}</span>}

        <button className="fp-btn-primary" onClick={handleNext} disabled={!!loading}>
          {loading ? "Verifying…" : "Continue"}
        </button>

        <div className="fp-resend">
          Didn't receive the code?
          <button onClick={handleResend} disabled={timeLeft > 0 || isResending}>
            {isResending ? "Resending…" : timeLeft > 0 ? `Resend in ${timeLeft}s` : "Resend code"}
          </button>
        </div>
      </>
    );

    if (step === STEPS.RESET) return (
      <>
        <div className="fp-heading-block">
          <h1 className="fp-heading">New password</h1>
          <p className="fp-sub">Must be 8+ characters with at least one letter and one number.</p>
        </div>

        <div className="fp-field">
          <label className="fp-label">New Password <span className="fp-required">*</span></label>
          <div className="fp-pw-wrap">
            <input
              type={showNewPassword ? "text" : "password"}
              className={`fp-input${newPwError ? " fp-input--error" : ""}`}
              placeholder="8+ characters, letter & number"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setNewPwError(""); dispatch(clearError()); }}
              onKeyDown={e => e.key === "Enter" && handleNext()}
            />
            <button type="button" className="fp-pw-eye" onClick={() => setShowNewPassword(p => !p)}>
              {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {newPwError && <span className="fp-error-msg">{newPwError}</span>}
        </div>

        <div className="fp-field">
          <label className="fp-label">Confirm Password <span className="fp-required">*</span></label>
          <div className="fp-pw-wrap">
            <input
              type={showConfirmPass ? "text" : "password"}
              className={`fp-input${confirmPwError ? " fp-input--error" : ""}`}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setConfirmPwError(""); dispatch(clearError()); }}
              onKeyDown={e => e.key === "Enter" && handleNext()}
            />
            <button type="button" className="fp-pw-eye" onClick={() => setShowConfirmPass(p => !p)}>
              {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {confirmPwError && <span className="fp-error-msg">{confirmPwError}</span>}
        </div>

        {error && <span className="fp-error-msg">{error}</span>}

        <button className="fp-btn-primary" onClick={handleNext} disabled={!!loading}>
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </>
    );

    if (step === STEPS.SUCCESS) {
      return (
        <div className="text-center py-4">
          <div className="mb-4 d-flex justify-content-center">
            <CheckCircle2 size={64} className="text-success" />
          </div>
          <h3 className="fw-bold mb-2">Success!</h3>
          <p className="text-muted mb-4" style={{ fontSize: "15px" }}>
            Your password has been successfully reset. You can now use your new
            password to log in.
          </p>
          <Button variant="dark" fullWidth onClick={() => navigate("/login")}>
            Return to Login
          </Button>
        </div>
      );
    }
  };

  const LeftSection = (
    <div className="fp-wrap">
      <div className="fp-orb fp-orb--1" />
      <div className="fp-orb fp-orb--2" />

      <div className="fp-inner">
        <div className="fp-brand">
          <span className="fp-brand__gem" />
          salonox
        </div>

        <div className="fp-step-content" key={step}>
          {renderContent()}
        </div>
      </div>
    </div>
  );

  const RightSection = (
    <div className="fp-right">
      <img src={salonImg} alt="salon" className="fp-right__img" />
      <div className="fp-right__overlay" />
      <div className="fp-right__content">
        <div className="fp-badge">
          <span className="fp-badge__dot" />
          Trusted by 10,000+ salons across India
        </div>
        <div className="fp-testimonial">
          <div className="fp-testimonial__stars">
            {[1, 2, 3, 4, 5].map(i => (
              <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#C9A96E">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <blockquote className="fp-testimonial__quote">
            "Recovering my account was effortless. The salonox team really thought of everything."
          </blockquote>
          <cite>
            <div className="fp-testimonial__name">Aarti Menon</div>
            <div className="fp-testimonial__role">Owner, Bliss Salon · Bengaluru</div>
          </cite>
        </div>
      </div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={LeftSection}
      rightContent={RightSection}
      className="fp-root"
    />
  );
}
