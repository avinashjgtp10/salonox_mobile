import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/RegisterPage.scss"
import { useState } from "react"
import salonImg from "../../../assets/images/salon.jpg"
import { useNavigate } from "react-router-dom"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import api from "../../../services/api/axios"
import { hashPassword } from "../../../utils/hashPassword"
import { Country } from "country-state-city"
import toast from "react-hot-toast"
import { useDispatch } from "react-redux" // Assuming useDispatch is needed for the login action
import { login } from "../../../store/authSlice" // Assuming login action is from this path

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch() // Initialize useDispatch
  const countries = Country.getAllCountries()

  /* ── Form state ── */
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    address: "",
    email: "",
    country: "IN",
    phone: "",
    countryCode: "+91",
    password: "",
    terms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  /* ── Email OTP state ── */
  const [emailOtp, setEmailOtp] = useState("")
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpVerified, setEmailOtpVerified] = useState(false)
  const [emailOtpLoading, setEmailOtpLoading] = useState(false)

  /* ── Mobile OTP state (dummy) ── */
  const DUMMY_MOBILE_OTP = "123456"
  const [mobileOtp, setMobileOtp] = useState("")
  const [mobileOtpSent, setMobileOtpSent] = useState(false)
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false)

  /* ================= FIELD CHANGE ================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
    // clear error on change
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  /* ================= VALIDATION ================= */
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!form.fullName.trim()) errs.fullName = "Full name is required"
    if (!form.businessName.trim()) errs.businessName = "Business name is required"
    if (!form.address.trim()) errs.address = "Address is required"
    if (!form.country) errs.country = "Country is required"
    if (!form.phone) errs.phone = "Phone number is required"

    if (!form.email.trim())
      errs.email = "Email is required"
    else if (!emailRegex.test(form.email))
      errs.email = "Invalid email format"

    if (
      !form.password ||
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    )
      errs.password = "Password must be 8+ characters with a letter and number"

    if (!form.terms) errs.terms = "You must accept the Terms & Conditions"
    if (!emailOtpVerified) errs.emailOtp = "Please verify your email OTP"
    if (!mobileOtpVerified) errs.mobileOtp = "Please verify your mobile number"

    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]) // show first error as toast
      return false
    }
    return true
  }

  /* ================= EMAIL OTP — SEND ================= */
  const handleSendEmailOtp = async () => {
    if (!form.email.trim()) {
      toast.error("Enter your email first")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      toast.error("Enter a valid email address")
      return
    }

    setEmailOtpLoading(true)
    const toastId = toast.loading("Sending OTP to your email...")

    try {
      await api.post("/api/v1/auth/send-email-otp", { email: form.email })
      setEmailOtpSent(true)
      toast.success("OTP sent! Check your inbox.", { id: toastId })
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.code === "EMAIL_EXISTS" || errorData?.message?.toLowerCase().includes("email already exist")) {
        setErrors(prev => ({ ...prev, email: errorData?.message || "Email already exists" }));
        setEmailOtpVerified(false);
        setEmailOtpSent(false);
        setEmailOtp("");
        toast.error(errorData?.message || "Email already exists", { id: toastId });
      } else {
        toast.error(
          errorData?.message || "Failed to send OTP. Try again.",
          { id: toastId }
        );
      }
    } finally {
      setEmailOtpLoading(false)
    }
  }

  /* ================= EMAIL OTP — VERIFY ================= */
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      toast.error("Enter the OTP sent to your email")
      return
    }

    setEmailOtpLoading(true)
    const toastId = toast.loading("Verifying OTP...")

    try {
      const res = await api.post("/api/v1/auth/verify-email-otp", {
        email: form.email,
        otp: emailOtp,
      })
      if (res.data?.status === "success" || res.data?.success || res.data?.data?.success) {
        setEmailOtpVerified(true)
        setErrors(prev => { const n = { ...prev }; delete n.emailOtp; return n })
        toast.success("Email verified successfully!", { id: toastId })
      } else {
        // Fallback if success flag is missing but request succeeded
        toast.error("Verification failed. Please check the OTP.", { id: toastId })
      }
    } catch (err: any) {
      setEmailOtpVerified(false)
      toast.error(
        err.response?.data?.message || "Invalid OTP. Please try again.",
        { id: toastId }
      )
    } finally {
      setEmailOtpLoading(false)
    }
  }

  /* ================= MOBILE OTP — SEND (dummy) ================= */
  const handleSendMobileOtp = () => {
    if (!form.phone.trim()) {
      toast.error("Enter your mobile number first")
      return
    }
    setMobileOtpSent(true)
    toast.success(`[Demo] Your mobile OTP is: ${DUMMY_MOBILE_OTP}`, { duration: 6000 })
  }

  /* ================= MOBILE OTP — VERIFY (dummy) ================= */
  const handleVerifyMobileOtp = () => {
    if (!mobileOtp.trim()) {
      toast.error("Enter the OTP")
      return
    }
    if (mobileOtp === DUMMY_MOBILE_OTP) {
      setMobileOtpVerified(true)
      setErrors(prev => { const n = { ...prev }; delete n.mobileOtp; return n })
      toast.success("Mobile number verified!")
    } else {
      toast.error(`Invalid OTP. [Demo] Use: ${DUMMY_MOBILE_OTP}`)
    }
  }

  /* ================= REGISTER ================= */
  const handleRegister = async () => {
    if (!validate()) return

    setLoading(true)
    const toastId = toast.loading("Creating your account...")

    try {
      const hashedPwd = await hashPassword(form.password)
      const response = await api.post("/api/v1/auth/register", {
        fullName: form.fullName,
        businessName: form.businessName,
        address: form.address,
        email: form.email,
        country: form.country,
        countryCode: form.countryCode,
        phone: form.phone,
        password: hashedPwd,
        terms: form.terms,
      })

      const { accessToken, refreshToken, isOnboardingComplete } = response.data.data;

      // Auto-login the user
      dispatch(login({ accessToken, refreshToken, isOnboardingComplete }))

      toast.success("Account created! Redirecting...", { id: toastId })
      navigate("/account-type")

    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.code === "EMAIL_EXISTS" || errorData?.message?.toLowerCase().includes("email already exist")) {
        setErrors(prev => ({ ...prev, email: errorData?.message || "Email already exists" }));
        setEmailOtpVerified(false);
        setEmailOtpSent(false);
        setEmailOtp("");
        toast.error(errorData?.message || "Email already exists", { id: toastId });
      } else {
        toast.error(
          errorData?.message || "Registration failed. Please try again.",
          { id: toastId }
        );
      }
    } finally {
      setLoading(false)
    }
  }

  /* ================= RENDER ================= */
  return (
    <div className="container-fluid p-0">
      <div className="row g-0 min-vh-100">

        {/* ── LEFT FORM ── */}
        <div className="col-lg-5 d-flex align-items-center justify-content-center bg-white px-4 px-md-5">
          <div className="w-100 py-4" style={{ maxWidth: "420px" }}>

            <div className="text-center w-100 mb-4">
              <h4 className="brand-logo d-inline-block m-0" style={{ fontSize: "24px" }}>salonox</h4>
            </div>

            <h2 className="fw-bold mb-1">Create Account</h2>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              Fill in the details below to get started.
            </p>

            {/* FULL NAME */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Full Name</label>
              <input
                className={`form-control ${errors.fullName ? "is-invalid" : ""}`}
                placeholder="e.g. John Doe"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
              />
              {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
            </div>

            {/* BUSINESS NAME */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Business Name</label>
              <input
                className={`form-control ${errors.businessName ? "is-invalid" : ""}`}
                placeholder="e.g. Glamour Salon"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
              />
              {errors.businessName && <div className="invalid-feedback">{errors.businessName}</div>}
            </div>

            {/* ADDRESS */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Address</label>
              <input
                className={`form-control ${errors.address ? "is-invalid" : ""}`}
                placeholder="e.g. 123 Main Street"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
              {errors.address && <div className="invalid-feedback">{errors.address}</div>}
            </div>

            {/* EMAIL + OTP */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Email address</label>
              <div className="d-flex gap-2">
                <input
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="example@domain.com"
                  name="email"
                  value={form.email}
                  onChange={(e) => {
                    handleChange(e)
                    // reset OTP state if email changes
                    if (emailOtpVerified || emailOtpSent) {
                      setEmailOtpSent(false)
                      setEmailOtpVerified(false)
                      setEmailOtp("")
                    }
                  }}
                  disabled={emailOtpVerified}
                />
                <button
                  className="btn btn-outline-dark flex-shrink-0"
                  style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                  onClick={handleSendEmailOtp}
                  disabled={emailOtpVerified || emailOtpLoading}
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
              {errors.email && (
                <div className="text-danger mt-1" style={{ fontSize: "12px" }}>{errors.email}</div>
              )}
            </div>

            {/* EMAIL OTP INPUT */}
            {emailOtpSent && !emailOtpVerified && (
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: "13px" }}>Enter Email OTP</label>
                <div className="d-flex gap-2">
                  <input
                    className="form-control"
                    placeholder="6-digit OTP"
                    value={emailOtp}
                    maxLength={6}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleVerifyEmailOtp() }}
                  />
                  <button
                    className="btn btn-success flex-shrink-0"
                    style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                    onClick={handleVerifyEmailOtp}
                    disabled={emailOtpLoading || emailOtp.length < 6}
                  >
                    {emailOtpLoading ? "Verifying…" : "Verify"}
                  </button>
                </div>
              </div>
            )}

            {/* Verified badge */}
            {emailOtpVerified && (
              <div className="mb-3 d-flex align-items-center gap-1" style={{ fontSize: "13px", color: "#16a34a" }}>
                <span>✓</span><span>Email verified</span>
              </div>
            )}

            {errors.emailOtp && (
              <div className="text-danger mb-2" style={{ fontSize: "12px" }}>{errors.emailOtp}</div>
            )}

            {/* COUNTRY */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Country</label>
              <select
                className={`form-select ${errors.country ? "is-invalid" : ""}`}
                name="country"
                value={form.country}
                onChange={handleChange}
              >
                <option value="">Select Country</option>
                {countries.map(c => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
              {errors.country && <div className="invalid-feedback">{errors.country}</div>}
            </div>

            {/* MOBILE + OTP */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Mobile number</label>
              <div className="d-flex gap-2 align-items-center">
                <div style={{ flex: 1 }}>
                  <PhoneInput
                    country={form.country ? form.country.toLowerCase() : "in"}
                    value={form.phone}
                    onChange={(value, countryData: any) => {
                      setForm(prev => ({
                        ...prev,
                        phone: value,
                        countryCode: countryData?.dialCode ? `+${countryData.dialCode}` : "",
                      }))
                      // reset mobile OTP if number changes
                      if (mobileOtpSent || mobileOtpVerified) {
                        setMobileOtpSent(false)
                        setMobileOtpVerified(false)
                        setMobileOtp("")
                      }
                      if (errors.phone) setErrors(prev => { const n = { ...prev }; delete n.phone; return n })
                    }}
                    disabled={mobileOtpVerified}
                    inputStyle={{ width: "100%", height: "38px", fontSize: "14px" }}
                  />
                </div>
                <button
                  className="btn btn-outline-dark flex-shrink-0"
                  style={{ fontSize: "13px", whiteSpace: "nowrap", height: "38px" }}
                  onClick={handleSendMobileOtp}
                  disabled={mobileOtpVerified}
                >
                  {mobileOtpVerified ? "✓ Verified" : mobileOtpSent ? "Resend" : "Send OTP"}
                </button>
              </div>
              {errors.phone && (
                <div className="text-danger mt-1" style={{ fontSize: "12px" }}>{errors.phone}</div>
              )}
            </div>

            {/* MOBILE OTP INPUT */}
            {mobileOtpSent && !mobileOtpVerified && (
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: "13px" }}>Enter Mobile OTP</label>
                <div className="alert alert-warning py-1 px-2 mb-2" style={{ fontSize: "12px" }}>
                  🧪 <strong>Demo OTP:</strong> {DUMMY_MOBILE_OTP}
                </div>
                <div className="d-flex gap-2">
                  <input
                    className="form-control"
                    placeholder="6-digit OTP"
                    value={mobileOtp}
                    maxLength={6}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleVerifyMobileOtp() }}
                  />
                  <button
                    className="btn btn-success flex-shrink-0"
                    style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                    onClick={handleVerifyMobileOtp}
                    disabled={mobileOtp.length < 6}
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {/* Mobile verified badge */}
            {mobileOtpVerified && (
              <div className="mb-3 d-flex align-items-center gap-1" style={{ fontSize: "13px", color: "#16a34a" }}>
                <span>✓</span><span>Mobile number verified</span>
              </div>
            )}

            {errors.mobileOtp && (
              <div className="text-danger mb-2" style={{ fontSize: "12px" }}>{errors.mobileOtp}</div>
            )}

            {/* PASSWORD */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Password</label>
              <input
                type="password"
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                placeholder="8+ characters, letter & number"
                name="password"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>

            {/* TERMS */}
            <div className="mb-4">
              <div className="form-check d-flex align-items-start gap-2">
                <input
                  type="checkbox"
                  className="form-check-input mt-1 flex-shrink-0"
                  id="terms"
                  name="terms"
                  checked={form.terms}
                  onChange={handleChange}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label
                  className="form-check-label"
                  htmlFor="terms"
                  style={{ fontSize: "13px", lineHeight: "1.5" }}
                >
                  I agree to the{" "}
                  <a href="#" style={{ color: "#6c63ff", textDecoration: "none" }}>Privacy Policy</a>,{" "}
                  <a href="#" style={{ color: "#6c63ff", textDecoration: "none" }}>Terms of Service</a>{" "}
                  and{" "}
                  <a href="#" style={{ color: "#6c63ff", textDecoration: "none" }}>Terms of Business</a>.
                </label>
              </div>
              {errors.terms && (
                <div className="text-danger mt-1" style={{ fontSize: "12px" }}>{errors.terms}</div>
              )}
            </div>

            {/* SUBMIT */}
            <button
              className="btn btn-dark w-100 d-flex align-items-center justify-content-center gap-2"
              style={{ borderRadius: "50px", padding: "12px", fontSize: "15px", fontWeight: "600" }}
              onClick={handleRegister}
              disabled={loading}
            >
              {loading && <span className="spinner-border spinner-border-sm" />}
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center mt-3 mb-0">
              <small className="text-muted">
                Already have an account?{" "}
                <span
                  className="fw-bold"
                  style={{ color: "#6c63ff", cursor: "pointer" }}
                  onClick={() => navigate("/login")}
                >
                  Login
                </span>
              </small>
            </p>

          </div>
        </div>

        {/* ── RIGHT IMAGE ── */}
        <div className="col-lg-7 d-none d-lg-block p-0" style={{ minHeight: "100vh" }}>

          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />
        </div>

      </div>
    </div>
  )
}