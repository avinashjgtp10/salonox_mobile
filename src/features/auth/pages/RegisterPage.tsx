import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import { Country } from "country-state-city";
import "react-phone-input-2/lib/style.css";
import { registerThunk, loginThunk } from "../../../middleware/auth/authThunk";
import {
  sendEmailOtpThunk,
  verifyEmailOtpThunk,
} from "../../../middleware/auth/otpThunk";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import salonImg from "../../../assets/images/salon.jpg";
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
  phone: string;
  countryCode: string;
  password: string;
  terms: boolean;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  businessName: "",
  address: "",
  email: "",
  country: "IN",
  phone: "",
  countryCode: "+91",
  password: "",
  terms: false,
};

const DEMO_MOBILE_OTP = "123456";

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading: authLoading } = useAppSelector((s) => s.auth);
  const loading = authLoading.register;
  const countries = Country.getAllCountries();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);

  const clearFieldError = (name: string) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[name];
      return n;
    });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    clearFieldError(name);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.businessName.trim()) errs.businessName = "Business name is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.country) errs.country = "Country is required";
    if (!form.phone) errs.phone = "Phone number is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!emailRx.test(form.email)) errs.email = "Invalid email format";

    if (
      !form.password ||
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    )
      errs.password = "Password must be 8+ characters with a letter and number";

    if (!form.terms) errs.terms = "You must accept the Terms & Conditions";
    if (!emailOtpVerified) errs.emailOtp = "Please verify your email OTP";
    if (!mobileOtpVerified) errs.mobileOtp = "Please verify your mobile number";

    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSendEmailOtp = async () => {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRx.test(form.email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setEmailOtpLoading(true);
    const tid = toast.loading("Sending OTP to your email…");
    const result = await dispatch(sendEmailOtpThunk({ email: form.email }));

    if (sendEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpSent(true);
      toast.success("OTP sent! Check your inbox.", { id: tid });
    } else {
      const msg = result.payload as string;
      if (msg?.toLowerCase().includes("email already exist")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setEmailOtpSent(false);
        setEmailOtpVerified(false);
        setEmailOtp("");
      }
      toast.error(msg ?? "Failed to send OTP.", { id: tid });
    }
    setEmailOtpLoading(false);
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) { toast.error("Enter the OTP"); return; }
    setEmailOtpLoading(true);
    const tid = toast.loading("Verifying OTP…");
    const result = await dispatch(
      verifyEmailOtpThunk({ email: form.email, otp: emailOtp }),
    );
    if (verifyEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpVerified(true);
      clearFieldError("emailOtp");
      toast.success("Email verified!", { id: tid });
    } else {
      toast.error((result.payload as string) ?? "Invalid OTP.", { id: tid });
    }
    setEmailOtpLoading(false);
  };

  const handleSendMobileOtp = () => {
    if (!form.phone.trim()) { toast.error("Enter your mobile number first"); return; }
    setMobileOtpSent(true);
    toast.success(`[Demo] Your OTP is: ${DEMO_MOBILE_OTP}`, { duration: 6000 });
  };

  const handleVerifyMobileOtp = () => {
    if (!mobileOtp.trim()) { toast.error("Enter the OTP"); return; }
    if (mobileOtp === DEMO_MOBILE_OTP) {
      setMobileOtpVerified(true);
      clearFieldError("mobileOtp");
      toast.success("Mobile number verified!");
    } else {
      toast.error(`Invalid OTP. [Demo] Use: ${DEMO_MOBILE_OTP}`);
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const tid = toast.loading("Creating your account…");
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
      toast.success("Account created! Logging you in…", { id: tid });
      const loginRes = await dispatch(
        loginThunk({ email: form.email, password: form.password })
      );
      if (loginThunk.fulfilled.match(loginRes)) {
        navigate("/account-type");
      } else {
        toast.error("Auto-login failed. Please log in manually.");
        navigate("/login");
      }
    } else {
      const msg = result.payload as string;
      if (msg?.toLowerCase().includes("email already exist")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setEmailOtpVerified(false);
        setEmailOtpSent(false);
        setEmailOtp("");
      }
      toast.error(msg ?? "Registration failed.", { id: tid });
    }
  };

  const LeftSection = (
    <div className="rp-wrap">
      <div className="rp-orb rp-orb--1" />
      <div className="rp-orb rp-orb--2" />

      <div className="rp-inner">
        <div className="rp-brand">
          <span className="rp-brand__gem" />
          salonox
        </div>

        <div className="rp-heading-block">
          <h1 className="rp-heading">Create your<br />account.</h1>
          <p className="rp-sub">Fill in the details below to get started.</p>
        </div>

        {/* ── FULL NAME ── */}
        <Input
          label="Full Name"
          placeholder="e.g. John Doe"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          error={errors.fullName}
          containerClass="rp-field"
        />

        {/* ── BUSINESS NAME ── */}
        <Input
          label="Business Name"
          placeholder="e.g. Glamour Salon"
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          error={errors.businessName}
          containerClass="rp-field"
        />

        {/* ── ADDRESS ── */}
        <Input
          label="Address"
          placeholder="e.g. 123 Main Street"
          name="address"
          value={form.address}
          onChange={handleChange}
          error={errors.address}
          containerClass="rp-field"
        />

        {/* ── EMAIL + OTP ── */}
        <div className="rp-field">
          <label className="rp-label">Email address</label>
          <div className="rp-input-row">
            <input
              type="email"
              className={`rp-input ${errors.email ? "rp-input--error" : ""}`}
              placeholder="example@domain.com"
              name="email"
              value={form.email}
              onChange={(e) => {
                handleChange(e);
                if (emailOtpVerified || emailOtpSent) {
                  setEmailOtpSent(false);
                  setEmailOtpVerified(false);
                  setEmailOtp("");
                }
              }}
              disabled={emailOtpVerified}
            />
            <button
              className={`rp-otp-btn ${emailOtpVerified ? "rp-otp-btn--verified" : ""}`}
              onClick={handleSendEmailOtp}
              disabled={emailOtpVerified || emailOtpLoading}
              type="button"
            >
              {emailOtpVerified
                ? "✓ Verified"
                : emailOtpLoading && !emailOtpSent
                  ? "Sending…"
                  : emailOtpSent
                    ? "Resend"
                    : "Send OTP"}
            </button>
          </div>
          {errors.email && <span className="rp-error-msg">{errors.email}</span>}
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

        {/* ── COUNTRY ── */}
        <div className="rp-field">
          <label className="rp-label">Country</label>
          <select
            className={`rp-select ${errors.country ? "rp-select--error" : ""}`}
            name="country"
            value={form.country}
            onChange={handleChange}
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
          {errors.country && <span className="rp-error-msg">{errors.country}</span>}
        </div>

        {/* ── MOBILE + OTP ── */}
        <div className="rp-field">
          <label className="rp-label">Mobile number</label>
          <div className="rp-input-row rp-phone-row">
            <div className="rp-phone-wrap">
              <PhoneInput
                country={form.country.toLowerCase() || "in"}
                value={form.phone}
                onChange={(value, countryData: any) => {
                  setForm((prev) => ({
                    ...prev,
                    phone: value,
                    countryCode: countryData?.dialCode ? `+${countryData.dialCode}` : "",
                  }));
                  if (mobileOtpSent || mobileOtpVerified) {
                    setMobileOtpSent(false);
                    setMobileOtpVerified(false);
                    setMobileOtp("");
                  }
                  clearFieldError("phone");
                }}
                disabled={mobileOtpVerified}
                inputStyle={{ width: "100%", height: "48px", fontSize: "14px", borderRadius: "10px", border: "1.5px solid #E8E4DE", fontFamily: "DM Sans, sans-serif" }}
                buttonStyle={{ borderRadius: "10px 0 0 10px", border: "1.5px solid #E8E4DE", borderRight: "none", background: "#F9F8F6" }}
              />
            </div>
            <button
              className={`rp-otp-btn ${mobileOtpVerified ? "rp-otp-btn--verified" : ""}`}
              onClick={handleSendMobileOtp}
              disabled={mobileOtpVerified}
              type="button"
            >
              {mobileOtpVerified ? "✓ Verified" : mobileOtpSent ? "Resend" : "Send OTP"}
            </button>
          </div>
          {errors.phone && <span className="rp-error-msg">{errors.phone}</span>}
        </div>

        {mobileOtpSent && !mobileOtpVerified && (
          <div className="rp-field rp-otp-field">
            <label className="rp-label">Enter Mobile OTP</label>
            <div className="rp-demo-hint">🧪 Demo OTP: <strong>{DEMO_MOBILE_OTP}</strong></div>
            <div className="rp-input-row">
              <input
                className="rp-input"
                placeholder="6-digit OTP"
                value={mobileOtp}
                maxLength={6}
                onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyMobileOtp()}
              />
              <button
                className="rp-verify-btn"
                onClick={handleVerifyMobileOtp}
                disabled={mobileOtp.length < 6}
                type="button"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {mobileOtpVerified && (
          <div className="rp-verified-tag">
            <span className="rp-verified-tag__check">✓</span>
            Mobile number verified
          </div>
        )}
        {errors.mobileOtp && <span className="rp-error-msg rp-error-msg--block">{errors.mobileOtp}</span>}

        {/* ── PASSWORD ── */}
        <Input
          type="password"
          label="Password"
          placeholder="8+ characters, letter & number"
          name="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          containerClass="rp-field"
        />

        {/* ── TERMS ── */}
        <div className="rp-field rp-terms">
          <label className="rp-terms__label">
            <input
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={handleChange}
              className="rp-terms__check"
            />
            <span className="rp-terms__text">
              I agree to the{" "}
              <a href="#" className="rp-terms__link">Privacy Policy</a>,{" "}
              <a href="#" className="rp-terms__link">Terms of Service</a> and{" "}
              <a href="#" className="rp-terms__link">Terms of Business</a>.
            </span>
          </label>
          {errors.terms && <span className="rp-error-msg">{errors.terms}</span>}
        </div>

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
      <div className="oip-overlay" />
      <div className="oip-topbar">
        <span className="oip-brand">salonox</span>
      </div>
      <div className="oip-spacer" />
      <div className="oip-bottom">
        <div className="oip-stats">
          <div>
            <div className="oip-stat-value">10K+</div>
            <div className="oip-stat-label">Professionals</div>
          </div>
          <div>
            <div className="oip-stat-value">4.9★</div>
            <div className="oip-stat-label">App Rating</div>
          </div>
          <div>
            <div className="oip-stat-value">Free</div>
            <div className="oip-stat-label">7-day trial</div>
          </div>
        </div>
        <div className="oip-quote-card">
          <div className="oip-stars">
            {[1,2,3,4,5].map((i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <p className="oip-quote-text">
            "Setting up on salonox was the best decision for my business. Everything just works — from day one."
          </p>
          <div className="oip-quote-author">
            <span className="oip-author-name">Sarah M.</span>
            <span className="oip-author-role">Hair Stylist, London</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SplitLayout leftContent={LeftSection} rightContent={RightSection} />
    </>
  );
}
