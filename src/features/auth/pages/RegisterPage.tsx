import "../styles/RegisterPage.scss"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { Country } from "country-state-city"
import salonImg from "../../../assets/images/salon.jpg"

import axios from "axios"
import { useDispatch } from "react-redux"
import { login } from "../../../store/authSlice"
import { jwtDecode } from "jwt-decode"

export default function RegisterPage() {

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState("")
  // ✅ MOBILE OTP STATES
 const [mobileOtp, setMobileOtp] = useState("")
 const [mobileOtpSent, setMobileOtpSent] = useState(false)
 const [mobileOtpVerified, setMobileOtpVerified] = useState(false)
 const [mobileOtpError, setMobileOtpError] = useState("")

  const [form, setForm] = useState({
    
    fullName: "",
    businessName: "",
    address: "",
    email: "",
    country: "",
    countryCode: "",
    phone: "",
    password: "",
    terms: false
  })

  const [errors, setErrors] = useState<any>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    })
  }

  const hasLength = form.password.length >= 8
  const hasNumber = /\d/.test(form.password)
  const hasLetter = /[A-Za-z]/.test(form.password)

  const validate = () => {
    const newErrors: any = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!form.fullName.trim())
      newErrors.fullName = "Full Name is required"

    if (!form.businessName.trim())
      newErrors.businessName = "Business Name is required"

    if (!form.address.trim())
      newErrors.address = "Address is required"

    if (!form.email.trim())
      newErrors.email = "Email is required"
    else if (!emailRegex.test(form.email))
      newErrors.email = "Invalid email format"

    if (!form.country)
      newErrors.country = "Country is required"

    if (!form.phone)
      newErrors.phone = "Mobile number is required"

    if (!form.password)
      newErrors.password = "Password is required"
    else if (!hasLength || !hasNumber || !hasLetter)
      newErrors.password =
        "Password must be 8+ characters and include letter & number"

    if (!form.terms)
      newErrors.terms = "You must accept Terms & Conditions"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
   const handleSendOtp = async () => {
  if (!form.email) {
    setErrors({ ...errors, email: "Enter email first" })
    return
  }

  try {
    setOtpSent(true)
    setOtpError("")
    setOtpVerified(false)
    alert("OTP sent successfully (Use 123456 for demo)")
  } catch (error: any) {
    setOtpError("Failed to send OTP")
  }
}

const handleVerifyOtp = () => {
  if (otp === "123456") {
    setOtpVerified(true)
    setOtpError("")
  } else {
    setOtpError("Invalid OTP")
    setOtpVerified(false)
  }
}
// ✅ SEND MOBILE OTP
const handleSendMobileOtp = () => {
  if (!form.phone) {
    setErrors({ ...errors, phone: "Enter mobile number first" })
    return
  }

  setMobileOtpSent(true)
  setMobileOtpVerified(false)
  setMobileOtpError("")
  alert("Mobile OTP sent (Use 654321 for demo)")
}

// ✅ VERIFY MOBILE OTP
const handleVerifyMobileOtp = () => {
  if (mobileOtp === "654321") {
    setMobileOtpVerified(true)
    setMobileOtpError("")
  } else {
    setMobileOtpError("Invalid Mobile OTP")
    setMobileOtpVerified(false)
  }
}


  const handleRegister = async () => {
    setIsSubmitted(true)

    if (!validate()) return

    try {
      const response = await axios.post(
        "http://localhost:5000/api/register",
        form
      )

      const token = response.data?.token
      if (!token) throw new Error("No token received")

      const decodedUser: any = jwtDecode(token)

      dispatch(
        login({
          user: decodedUser,
          token: token
        })
      )

      localStorage.setItem("token", token)

      navigate("/dashboard")

    } catch (error: any) {
      alert(error.response?.data?.message || error.message)
    }
  }

  return (
    <div className="register-container">

      <div className="left">
        <div className="card">

          <h2>Create a professional account</h2>
          <p className="sub">Sign up and manage your business</p>

          {/* FULL NAME */}
          <div className="field">
            <label>Full Name *</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className={isSubmitted && errors.fullName ? "error-border" : ""}
            />
            {isSubmitted && errors.fullName && <p className="error">{errors.fullName}</p>}
          </div>

          {/* BUSINESS NAME */}
          <div className="field">
            <label>Business Name *</label>
            <input
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              className={isSubmitted && errors.businessName ? "error-border" : ""}
            />
            {isSubmitted && errors.businessName && <p className="error">{errors.businessName}</p>}
          </div>

          {/* ADDRESS */}
          <div className="field">
            <label>Address *</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className={isSubmitted && errors.address ? "error-border" : ""}
            />
            {isSubmitted && errors.address && <p className="error">{errors.address}</p>}
          </div>

          {/* EMAIL */}
<div className="field">
  <label>Email *</label>

  {/* Email + Send OTP */}
  <div className="otp-row">
    <input
      name="email"
      placeholder="example@gmail.com"
      value={form.email}
      onChange={handleChange}
    />

    <button
      type="button"
      className="otp-btn"
      onClick={handleSendOtp}
      disabled={otpSent}
    >
      {otpSent ? "OTP Sent" : "Send OTP"}
    </button>
  </div>

  {/* OTP Field */}
  {otpSent && (
    <div className="otp-row otp-second">
      <input
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        type="button"
        className="verify-btn"
        onClick={handleVerifyOtp}
      >
        Verify
      </button>
    </div>
  )}

  {/* Success */}
  {otpVerified && (
    <p className="otp-success">✓ OTP Verified</p>
  )}

  {otpError && <p className="error">{otpError}</p>}
</div>

          {/* COUNTRY */}
          <div className="field">
            <label>Country *</label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className={isSubmitted && errors.country ? "error-border" : ""}
            >
              <option value="">Select Country</option>
              {Country.getAllCountries().map((country) => (
                <option key={country.isoCode} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            {isSubmitted && errors.country && <p className="error">{errors.country}</p>}
          </div>

         {/* MOBILE NUMBER */}
<div className="field">
  <label>Mobile Number *</label>

  <div className="otp-row">
    <PhoneInput
      country="in"
      value={form.phone}
      onChange={(value) =>
        setForm({ ...form, phone: value })
      }
    />

    <button
      type="button"
      className="otp-btn"
      onClick={handleSendMobileOtp}
      disabled={mobileOtpSent}
    >
      {mobileOtpSent ? "OTP Sent" : "Send OTP"}
    </button>
  </div>

  {mobileOtpSent && (
    <div className="otp-row otp-second">
      <input
        placeholder="Enter Mobile OTP"
        value={mobileOtp}
        onChange={(e) => setMobileOtp(e.target.value)}
      />

      <button
        type="button"
        className="verify-btn"
        onClick={handleVerifyMobileOtp}
      >
        Verify
      </button>
    </div>
  )}

  {mobileOtpVerified && (
    <p className="otp-success">✓ Mobile OTP Verified</p>
  )}

  {mobileOtpError && <p className="error">{mobileOtpError}</p>}
</div>


          {/* PASSWORD */}
          <div className="field">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={isSubmitted && errors.password ? "error-border" : ""}
            />

            {isSubmitted && (
              <div className="password-rules">
                <p className={hasLength ? "valid" : "invalid"}>✓ 8+ characters</p>
                <p className={hasNumber ? "valid" : "invalid"}>✓ Contains number</p>
                <p className={hasLetter ? "valid" : "invalid"}>✓ Contains letter</p>
              </div>
            )}

            {isSubmitted && errors.password && <p className="error">{errors.password}</p>}
          </div>

          {/* TERMS */}
          <div className="terms-wrapper">
            <label className="terms-label">
              <input
                type="checkbox"
                name="terms"
                checked={form.terms}
                onChange={handleChange}
              />
              <span>I agree to Terms & Conditions</span>
            </label>
            {isSubmitted && errors.terms && <p className="error">{errors.terms}</p>}
          </div>

           {/* reCAPTCHA TEXT */}
           <button
  className="signup-btn"
  onClick={() => navigate("/account-type")}
>
  Next
</button>


          <p className="recaptcha-text">
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{" "}
            apply.
          </p>

          <p className="login-link">
            Already have an account? <Link to="/">Log In</Link>
          </p>

        </div>
      </div>

      <div className="right">
        <img src={salonImg} alt="Register" />
      </div>

    </div>
  )
}