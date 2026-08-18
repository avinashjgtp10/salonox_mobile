import React, { useState, type ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import CountryPhoneDropdown from "../components/CountryPhoneDropdown";
import { registerThunk, loginThunk } from "../../../middleware/auth/authThunk";
import {
  sendEmailOtpThunk,
  verifyEmailOtpThunk,
} from "../../../middleware/auth/otpThunk";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import salonImg from "../../../assets/images/dashboard-hero.jpg.png";
import salonoxMark from "../../../assets/salonox_mark.jpg";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import SplitLayout from "../../../components/ui/SplitLayout";
import "../styles/RegisterPage.scss";
import "../styles/onboarding-shared.scss";

interface FormState {
  fullName: string;
  businessName: string;
  address: string;
  email: string;
  country: string;
  countryName: string;
  phone: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  businessName: "",
  address: "",
  email: "",
  country: "IN",
  countryName: "India",
  phone: "",
  countryCode: "+91",
  password: "",
  confirmPassword: "",
  terms: false,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading } = useAppSelector((s) => s.auth);
  const loading = authLoading.register;

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpMsg, setEmailOtpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearFieldError = (name: string) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[name];
      return n;
    });

  const validateField = (name: string, value: string): string | null => {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 3) return "Full name must be at least 3 characters";
        break;
      case "businessName":
        if (!value.trim()) return "Business name is required";
        if (value.trim().length < 3) return "Business name must be at least 3 characters";
        break;
      case "address":
        if (!value.trim()) return "Address is required";
        if (value.trim().length < 3) return "Address must be at least 3 characters";
        break;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!emailRx.test(value)) return "Please enter a valid email address";
        break;
      case "phone":
        if (!value.trim()) return "Mobile number is required";
        if (value.length < 5 || value.length > 11) return "Mobile number must be between 5 and 11 digits";
        break;
      case "password":
        if (!value || value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value))
          return "Password must be 8+ characters with a letter and number";
        break;
      case "confirmPassword":
        if (value !== form.password) return "Passwords do not match";
        break;
    }
    return null;
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const FIELD_SCROLL_ORDER = [
    "fullName", "businessName", "address",
    "email", "emailOtp",
    "phone",
    "password", "confirmPassword", "terms",
  ];

  const scrollToFirstError = (errs: Record<string, string>) => {
    for (const field of FIELD_SCROLL_ORDER) {
      if (!errs[field]) continue;
      const targetId = field === "emailOtp" ? "rp-email" : `rp-${field}`;
      const el = document.getElementById(targetId) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
        return;
      }
    }
  };

  const TEXT_ONLY_FIELDS = new Set(["fullName", "businessName"]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const sanitized =
      name === "fullName" ? value.replace(/[^a-zA-Z\s]/g, "") :
      TEXT_ONLY_FIELDS.has(name) ? value.replace(/[0-9]/g, "") :
      value;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : sanitized,
    }));
    clearFieldError(name);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    else if (form.fullName.trim().length < 3) errs.fullName = "Full name must be at least 3 characters";

    if (!form.businessName.trim()) errs.businessName = "Business name is required";
    else if (form.businessName.trim().length < 3) errs.businessName = "Business name must be at least 3 characters";

    if (!form.address.trim()) errs.address = "Address is required";
    else if (form.address.trim().length < 3) errs.address = "Address must be at least 3 characters";
    if (!form.phone) errs.phone = "Mobile number is required";
    else if (form.phone.length < 5 || form.phone.length > 11) errs.phone = "Mobile number must be between 5 and 11 digits";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!emailRx.test(form.email)) errs.email = "Invalid email format";

    if (
      !form.password ||
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    )
      errs.password = "Password must be 8+ characters with a letter and number";

    if (form.confirmPassword !== form.password) errs.confirmPassword = "Passwords do not match";
    if (!form.terms) errs.terms = "You must accept the Terms & Conditions";
    if (!errs.email && !emailOtpVerified) errs.emailOtp = "Please verify your email OTP";

    setErrors(errs);
    if (Object.keys(errs).length) {
      scrollToFirstError(errs);
      return false;
    }
    return true;
  };

  const handleSendEmailOtp = async () => {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      setErrors(prev => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (!emailRx.test(form.email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      return;
    }
    setEmailOtpVerified(false);
    setEmailOtpSent(false);
    setEmailOtp("");
    setEmailOtpMsg(null);
    setEmailOtpLoading(true);
    const result = await dispatch(sendEmailOtpThunk({ email: form.email }));

    if (sendEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpSent(true);
      setEmailOtpMsg({ type: "success", text: "OTP sent! Check your inbox." });
    } else {
      const msg = result.payload as string;
      if (msg?.toLowerCase().includes("email already exist")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setEmailOtpSent(false);
        setEmailOtpVerified(false);
        setEmailOtp("");
      }
      setEmailOtpMsg({ type: "error", text: msg ?? "Failed to send OTP." });
    }
    setEmailOtpLoading(false);
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) { setErrors(prev => ({ ...prev, emailOtp: "Please enter the OTP" })); return; }
    setEmailOtpLoading(true);
    const result = await dispatch(verifyEmailOtpThunk({ email: form.email, otp: emailOtp }));
    if (verifyEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpVerified(true);
      setEmailOtpMsg(null);
      clearFieldError("emailOtp");
    } else {
      setErrors(prev => ({ ...prev, emailOtp: (result.payload as string) ?? "Invalid OTP." }));
    }
    setEmailOtpLoading(false);
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await dispatch(
      registerThunk({
        fullName: form.fullName,
        businessName: form.businessName,
        address: form.address,
        email: form.email,
        country: form.country,
        countryCode: form.countryCode,
        phone: form.phone,
        rawPassword: form.password,
        terms: form.terms,
      }),
    );
    if (registerThunk.fulfilled.match(result)) {
      const loginRes = await dispatch(
        loginThunk({ email: form.email, password: form.password })
      );
      if (loginThunk.fulfilled.match(loginRes)) {
        navigate("/business-name");
      } else {
        navigate("/login");
      }
    } else {
      const msg = result.payload as string;
      if (msg?.toLowerCase().includes("email already exist")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setEmailOtpVerified(false);
        setEmailOtpSent(false);
        setEmailOtp("");
      } else {
        setErrors((prev) => ({ ...prev, api: msg ?? "Registration failed." }));
      }
    }
  };

  const LeftSection = (
    <div className="rp-wrap">
      <div className="rp-orb rp-orb--1" />
      <div className="rp-orb rp-orb--2" />

      <div className="rp-inner">
        <div className="rp-brand">
          <img src={salonoxMark} alt="" className="rp-brand__icon" width="32" height="32" />
          <span className="rp-brand__wordmark">
            Salon<span className="rp-brand__wordmark-accent">OX</span>
          </span>
        </div>

        <div className="rp-heading-block">
          <h1 className="rp-heading whitespace-nowrap">Create your account.</h1>
          <p className="rp-sub">Fill in the details below to get started.</p>
        </div>

        {/* ── FULL NAME ── */}
        <Input
          id="rp-fullName"
          label={<>Full Name <span className="rp-required">*</span></>}
          placeholder="e.g. John Doe"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.fullName}
          containerClass="rp-field"
        />

        {/* ── BUSINESS NAME ── */}
        <Input
          id="rp-businessName"
          label={<>Business Name <span className="rp-required">*</span></>}
          placeholder="e.g. Glamour Salon"
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.businessName}
          containerClass="rp-field"
        />

        {/* ── ADDRESS ── */}
        <Input
          id="rp-address"
          label={<>Address <span className="rp-required">*</span></>}
          placeholder="e.g. 123 Main Street"
          name="address"
          value={form.address}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.address}
          containerClass="rp-field"
        />

        {/* ── EMAIL + OTP ── */}
        <div className="rp-field">
          <label className="rp-label">Email address <span className="rp-required">*</span></label>
          <div className="rp-input-row">
            <input
              id="rp-email"
              type="email"
              className={`rp-input ${errors.email ? "rp-input--error" : ""}`}
              placeholder="example@domain.com"
              name="email"
              value={form.email}
              onBlur={handleBlur}
              onChange={(e) => {
                handleChange(e);
                if (emailOtpVerified || emailOtpSent) {
                  setEmailOtpSent(false);
                  setEmailOtpVerified(false);
                  setEmailOtp("");
                  setEmailOtpMsg(null);
                }
              }}
            />
            <button
              className="rp-otp-btn"
              onClick={handleSendEmailOtp}
              disabled={emailOtpLoading}
              type="button"
            >
              {emailOtpLoading && !emailOtpSent
                ? "Sending…"
                : emailOtpSent || emailOtpVerified
                  ? "Resend"
                  : "Send OTP"}
            </button>
          </div>
          {errors.email && <span className="rp-error-msg">{errors.email}</span>}
          {!errors.email && emailOtpMsg && (
            <span className={`rp-otp-msg rp-otp-msg--${emailOtpMsg.type}`}>{emailOtpMsg.text}</span>
          )}
        </div>

        {emailOtpSent && !emailOtpVerified && (
          <div className="rp-field rp-otp-field">
            <label className="rp-label">Enter Email OTP</label>
            <div className="rp-input-row">
              <input
                className="rp-input"
                placeholder="6-digit OTP"
                value={emailOtp}
                maxLength={6}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyEmailOtp()}
              />
              <button
                className="rp-verify-btn"
                onClick={handleVerifyEmailOtp}
                disabled={emailOtpLoading || emailOtp.length < 6}
                type="button"
              >
                {emailOtpLoading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>
        )}

        {emailOtpVerified && (
          <div className="rp-verified-tag">
            <span className="rp-verified-tag__check">✓</span>
            Email verified
          </div>
        )}
        {errors.emailOtp && <span className="rp-error-msg rp-error-msg--block">{errors.emailOtp}</span>}

        {/* ── MOBILE + COUNTRY ── */}
        <div className="rp-field">
          <label className="rp-label">Mobile Number <span className="rp-required">*</span></label>
          <CountryPhoneDropdown
            country={form.country}
            countryName={form.countryName}
            countryCode={form.countryCode}
            phone={form.phone}
            onChange={({ country, countryName, countryCode, phone }) => {
              setForm(prev => ({ ...prev, country, countryName, countryCode, phone }));
              clearFieldError("phone");
            }}
            error={errors.phone}
            onBlur={() => {
              const err = !form.phone
                ? "Mobile number is required"
                : form.phone.length < 5 || form.phone.length > 11
                ? "Mobile number must be between 5 and 11 digits"
                : undefined;
              if (err) setErrors(prev => ({ ...prev, phone: err }));
            }}
          />
          {errors.phone && <span className="rp-error-msg">{errors.phone}</span>}
        </div>

        {/* ── PASSWORD ── */}
        <div className="rp-field">
          <label className="rp-label">Password <span className="rp-required">*</span></label>
          <div className="rp-pw-wrap">
            <input
              id="rp-password"
              type={showPassword ? "text" : "password"}
              className={`rp-input ${errors.password ? "rp-input--error" : ""}`}
              placeholder="8+ characters, letter & number"
              name="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <button type="button" className="rp-pw-eye" onClick={() => setShowPassword(p => !p)}>
              {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
            </button>
          </div>
          {errors.password && <span className="rp-error-msg">{errors.password}</span>}
        </div>

        {/* ── CONFIRM PASSWORD ── */}
        <div className="rp-field">
          <label className="rp-label">Confirm Password <span className="rp-required">*</span></label>
          <div className="rp-pw-wrap">
            <input
              id="rp-confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              className={`rp-input ${errors.confirmPassword ? "rp-input--error" : ""}`}
              placeholder="Re-enter your password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <button type="button" className="rp-pw-eye" onClick={() => setShowConfirmPassword(p => !p)}>
              {showConfirmPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
            </button>
          </div>
          {errors.confirmPassword && <span className="rp-error-msg">{errors.confirmPassword}</span>}
        </div>

        {/* ── TERMS ── */}
        <div className="rp-field rp-terms">
          <label className="rp-terms__label">
            <input
              id="rp-terms"
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={handleChange}
              className="rp-terms__check"
            />
            <span className="rp-terms__text">
              I agree to the{" "}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="rp-terms__link">Terms & Conditions</Link>.
            </span>
          </label>
          {errors.terms && <span className="rp-error-msg">{errors.terms}</span>}
        </div>

        {errors.api && <span className="rp-error-msg">{errors.api}</span>}

        <Button
          variant="dark"
          fullWidth
          onClick={handleRegister}
          loading={loading}
          className="rp-btn-primary"
        >
          Create account
        </Button>

        <p className="rp-login-link">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Sign in</span>
        </p>
      </div>
    </div>
  );

  const RightSection = (
    <div className="d-flex flex-column onboarding-image-panel" style={{ height: "100%", minHeight: "100vh" }}>
      <img src={salonImg} alt="salon" className="oip-bg" />
    </div>
  );

  return (
    <>
      <SplitLayout leftContent={LeftSection} rightContent={RightSection} />
    </>
  );
}
