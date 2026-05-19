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

import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import SplitLayout from "../../../components/ui/SplitLayout";

import salonImg from "../../../assets/images/salon.jpg";
import "../styles/forgot-password.css";

const STEPS = {
  EMAIL: 1,
  OTP: 2,
  RESET: 3,
  SUCCESS: 4,
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading, error: reduxError } = useAppSelector(
    (state) => state.auth,
  );

  const [step, setStep] = useState(STEPS.EMAIL);

  // Map each wizard step to its specific loading flag
  const loading =
    step === STEPS.EMAIL
      ? authLoading.forgotSendOtp
      : step === STEPS.OTP
        ? authLoading.forgotVerifyOtp
        : step === STEPS.RESET
          ? authLoading.forgotReset
          : false;
  const [localError, setLocalError] = useState("");
  const [isResending, setIsResending] = useState(false);

  const error = localError || reduxError;

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);

  // Refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Clear errors on step change
  useEffect(() => {
    setLocalError("");
    dispatch(clearError());
  }, [step, dispatch]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleNext = async () => {
    setLocalError("");
    dispatch(clearError());

    if (step === STEPS.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email)) {
        setLocalError("Please enter a valid email address.");
        return;
      }

      const result = await dispatch(forgotPasswordSendOtpThunk({ email }));
      if (forgotPasswordSendOtpThunk.fulfilled.match(result)) {
        setTimeLeft(60);
        setStep(STEPS.OTP);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } else if (step === STEPS.OTP) {
      const otpString = otp.join("");
      if (otpString.length !== 6) {
        setLocalError("Please enter the complete 6-digit code.");
        return;
      }

      const result = await dispatch(
        forgotPasswordVerifyOtpThunk({ email, otp: otpString }),
      );
      if (forgotPasswordVerifyOtpThunk.fulfilled.match(result)) {
        setStep(STEPS.RESET);
      }
    } else if (step === STEPS.RESET) {
      if (
        !newPassword ||
        newPassword.length < 8 ||
        !/[A-Za-z]/.test(newPassword) ||
        !/\d/.test(newPassword)
      ) {
        setLocalError(
          "Password must be 8+ characters with a letter and number",
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }

      const otpString = otp.join("");
      const result = await dispatch(
        forgotPasswordResetThunk({
          email,
          otp: otpString,
          rawPassword: newPassword,
        }),
      );

      if (forgotPasswordResetThunk.fulfilled.match(result)) {
        setStep(STEPS.SUCCESS);
      }
    }
  };

  const handleBack = () => {
    if (step === STEPS.OTP || step === STEPS.RESET) {
      setStep(step - 1);
    } else {
      navigate("/login");
    }
  };

  const handleResend = async () => {
    if (timeLeft === 0) {
      setIsResending(true);
      const result = await dispatch(forgotPasswordSendOtpThunk({ email }));
      setIsResending(false);
      if (forgotPasswordSendOtpThunk.fulfilled.match(result)) {
        setTimeLeft(60);
      }
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }

    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const chars = pastedData.split("");
    const newOtp = [...otp];
    chars.forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(chars.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  const renderContent = () => {
    if (step === STEPS.EMAIL) {
      return (
        <div>
          <h3 className="fw-bold text-center mb-2">Forgot Password?</h3>
          <p
            className="text-muted text-center mb-4"
            style={{ fontSize: "15px" }}
          >
            Enter your email and we'll send you a 6-digit code to reset your
            password.
          </p>

          <Input
            label="Email address"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            containerClass="mb-4"
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            floating
          />

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <Button
            variant="dark"
            fullWidth
            onClick={handleNext}
            loading={loading}
          >
            Send OTP
          </Button>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/login")}
              className="btn btn-link text-decoration-none p-0 fw-bold"
              style={{ fontSize: "14px" }}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    if (step === STEPS.OTP) {
      return (
        <div>
          <div className="d-flex align-items-center mb-3">
            <button onClick={handleBack} className="btn p-0 me-3 shadow-none">
              <ArrowLeft size={20} />
            </button>
            <h3 className="fw-bold m-0">Enter Code</h3>
          </div>
          <p className="text-muted mb-4" style={{ fontSize: "15px" }}>
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>

          <div className="fp-otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                className="fp-otp-input"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <Button
            variant="dark"
            fullWidth
            onClick={handleNext}
            className="mb-4"
            disabled={loading}
          >
            Continue
          </Button>

          <div className="text-center">
            <span className="text-muted" style={{ fontSize: "14px" }}>
              Didn't receive the code?{" "}
            </span>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={timeLeft > 0 || isResending}
              loading={isResending}
              className={`p-0 text-decoration-none fw-bold shadow-none ${timeLeft > 0 ? "text-muted" : "text-primary"}`}
              style={{ fontSize: "14px", verticalAlign: "baseline" }}
            >
              {timeLeft > 0 ? `Resend in ${timeLeft}s` : "Resend Code"}
            </Button>
          </div>
        </div>
      );
    }

    if (step === STEPS.RESET) {
      return (
        <div>
          <div className="d-flex align-items-center mb-3">
            <button onClick={handleBack} className="btn p-0 me-3 shadow-none">
              <ArrowLeft size={20} />
            </button>
            <h3 className="fw-bold m-0">Reset Password</h3>
          </div>
          <p className="text-muted mb-4" style={{ fontSize: "15px" }}>
            Create a new password that is 8+ characters long, including a letter
            and a number.
          </p>

          <div className="position-relative mb-3">
            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              placeholder="8+ characters, letter & number"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setLocalError("");
                dispatch(clearError());
              }}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              floating
            />
            <button
              type="button"
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted px-3 shadow-none text-decoration-none"
              style={{ zIndex: 10, marginTop: "12px" }}
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="position-relative mb-4">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setLocalError("");
                dispatch(clearError());
              }}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              floating
            />
            <button
              type="button"
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted px-3 shadow-none text-decoration-none"
              style={{ zIndex: 10, marginTop: "12px" }}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <Button
            variant="dark"
            fullWidth
            onClick={handleNext}
            disabled={loading}
          >
            Continue
          </Button>
        </div>
      );
    }

    if (step === STEPS.SUCCESS) {
      return (
        <div className="text-center py-4">
          <div className="mb-4 d-flex justify-content-center">
            <CheckCircle2 size={64} className="text-success" />
          </div>
          <h3 className="fw-bold mb-2">Password Reset!</h3>
          <p className="text-muted mb-2" style={{ fontSize: "15px" }}>
            Your password has been successfully reset. You can now use your new
            password to log in.
          </p>
          <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
            A confirmation email has been sent to <strong>{email}</strong>.
          </p>
          <Button variant="dark" fullWidth onClick={() => navigate("/login")}>
            Login Now
          </Button>
        </div>
      );
    }
  };

  const LeftSection = (
    <Card
      className="forgot-password-card"
      style={{ width: "100%", maxWidth: "420px" }}
      title={
        <div className="text-center w-100 mb-2">
          <h4 className="brand-logo d-inline-block">salonox</h4>
        </div>
      }
    >
      <div className="fp-step-content" key={step}>
        {renderContent()}
      </div>
    </Card>
  );

  const RightSection = (
    <div className="w-100 h-100">
      <img
        src={salonImg}
        alt="salon"
        className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
        style={{ zIndex: 0 }}
      />
      <div
        className="right-overlay position-absolute top-0 start-0 w-100 h-100"
        style={{ zIndex: 1, backgroundColor: "rgba(0,0,0,0.1)" }}
      ></div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={LeftSection}
      rightContent={RightSection}
      className="login-page-bg"
    />
  );
}
