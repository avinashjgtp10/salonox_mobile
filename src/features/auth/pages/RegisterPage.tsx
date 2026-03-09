import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/RegisterPage.scss"
import { useState } from "react"
import salonImg from "../../../assets/images/salon.jpg"
import { useNavigate } from "react-router-dom"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import api from "../../../services/api/axios"
import { useDispatch } from "react-redux"
import { login } from "../../../store/authSlice"
import { jwtDecode } from "jwt-decode"
import { Country } from "country-state-city"

export default function RegisterPage() {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const countries = Country.getAllCountries()

  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    address: "",
    email: "",
    country: "",
    phone: "",
    password: "",
    terms: false
  })

  const [emailOtp, setEmailOtp] = useState("")
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpVerified, setEmailOtpVerified] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const [mobileOtp, setMobileOtp] = useState("")
  const [mobileOtpSent, setMobileOtpSent] = useState(false)
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false)

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  /* ================= VALIDATION ================= */

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

    if (!form.password ||
        form.password.length < 8 ||
        !/[A-Za-z]/.test(form.password) ||
        !/\d/.test(form.password))
      newErrors.password =
        "Password must be 8+ characters with letter & number"

    if (!form.terms)
      newErrors.terms = "Accept Terms & Conditions"

    if (!emailOtpVerified)
      newErrors.emailOtp = "Email OTP not verified"

    if (!mobileOtpVerified)
      newErrors.mobileOtp = "Mobile OTP not verified"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ================= EMAIL OTP SEND ================= */

  const handleSendEmailOtp = async () => {

    if (!form.email) {
      alert("Enter email first")
      return
    }

    try {

      await api.post(
  "/api/v1/auth/send-email-otp",
  { email: form.email }
)
      setEmailOtpSent(true)
      alert("OTP sent to your email")

    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to send OTP")
    }
  }

  /* ================= EMAIL OTP VERIFY ================= */

  const handleVerifyEmailOtp = async () => {

    if (!emailOtp) {
      alert("Enter OTP first")
      return
    }

    try {

      setVerifyingOtp(true)

      const response = await api.post(
  "/api/v1/auth/verify-email-otp",
  {
    email: form.email,
    otp: emailOtp
  }
)
      

      if (response.data.success) {
        setEmailOtpVerified(true)
        alert("Email OTP Verified Successfully")
      }

    } catch (error: any) {
      setEmailOtpVerified(false)
      alert(error.response?.data?.message || "Invalid OTP")
    } finally {
      setVerifyingOtp(false)
    }
  }

  /* ================= MOBILE OTP (Demo) ================= */

  const handleSendMobileOtp = () => {
    if (!form.phone) {
      alert("Enter mobile number first")
      return
    }
    setMobileOtpSent(true)
  }

  const handleVerifyMobileOtp = () => {
    if (mobileOtp.length === 6) {
      setMobileOtpVerified(true)
    } else {
      alert("Enter valid 6 digit mobile OTP")
    }
  }

  /* ================= REGISTER ================= */

  const handleRegister = async () => {

    if (!validate()) return

    try {

      setLoading(true)

      const response = await api.post(
  "/api/v1/auth/register",
  form
)
      const token = response.data.token
      const decodedUser: any = jwtDecode(token)

      dispatch(login({ user: decodedUser, token }))
      localStorage.setItem("token", token)

      alert("Registration Successful")
      navigate("/account-type")

    } catch (error: any) {
      alert(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid p-0">
      <div className="row g-0 min-vh-100">

        <div className="col-lg-5 d-flex align-items-center px-5 bg-white">
          <div className="w-100">

            <h4 className="brand-logo text-center mb-4">salonox</h4>
            <h2 className="fw-bold mb-4">Create Account</h2>

            {/* Full Name */}
            <input className="form-control mb-2"
              placeholder="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange} />
            {errors.fullName && <small className="text-danger">{errors.fullName}</small>}

            {/* Business Name */}
            <input className="form-control mb-2"
              placeholder="Business Name"
              name="businessName"
              value={form.businessName}
              onChange={handleChange} />
            {errors.businessName && <small className="text-danger">{errors.businessName}</small>}

            {/* Address */}
            <input className="form-control mb-2"
              placeholder="Address"
              name="address"
              value={form.address}
              onChange={handleChange} />
            {errors.address && <small className="text-danger">{errors.address}</small>}

            {/* Email */}
            <input className="form-control mb-2"
              placeholder="Email"
              name="email"
              value={form.email}
              onChange={handleChange} />
            {errors.email && <small className="text-danger">{errors.email}</small>}

            <button className="btn btn-dark mb-2"
              onClick={handleSendEmailOtp}
              disabled={emailOtpVerified}>
              Send Email OTP
            </button>

            {emailOtpSent && (
              <>
                <input className="form-control mb-2"
                  placeholder="Enter Email OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)} />
                <button className="btn btn-success mb-2"
                  onClick={handleVerifyEmailOtp}
                  disabled={verifyingOtp}>
                  {verifyingOtp ? "Verifying..." : "Verify Email OTP"}
                </button>
              </>
            )}
            {errors.emailOtp && <small className="text-danger">{errors.emailOtp}</small>}

            {/* Country */}
            <select className="form-select mb-2"
              name="country"
              value={form.country}
              onChange={handleChange}>
              <option value="">Select Country</option>
              {countries.map(c => (
                <option key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Phone */}
            <PhoneInput
              country={form.country ? form.country.toLowerCase() : "in"}
              value={form.phone}
              onChange={(value) =>
                setForm(prev => ({ ...prev, phone: value }))
              }
            />

            <button className="btn btn-dark mt-2"
              onClick={handleSendMobileOtp}>
              Send Mobile OTP
            </button>

            {mobileOtpSent && (
              <>
                <input className="form-control mt-2"
                  placeholder="Enter Mobile OTP"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)} />
                <button className="btn btn-success mt-2"
                  onClick={handleVerifyMobileOtp}>
                  Verify Mobile OTP
                </button>
              </>
            )}
            {errors.mobileOtp && <small className="text-danger">{errors.mobileOtp}</small>}

            {/* Password */}
            <input type="password"
              className="form-control mt-3"
              placeholder="Password"
              name="password"
              value={form.password}
              onChange={handleChange} />
            {errors.password && <small className="text-danger">{errors.password}</small>}

            {/* Terms */}
            <div className="form-check mt-2">
              <input type="checkbox"
                className="form-check-input"
                name="terms"
                checked={form.terms}
                onChange={handleChange} />
              <label className="form-check-label">
                Accept Terms
              </label>
            </div>
            {errors.terms && <small className="text-danger">{errors.terms}</small>}

            <button
              className="btn btn-dark w-100 rounded-pill mt-4"
              onClick={handleRegister}
              disabled={loading}>
              {loading ? "Processing..." : "Next"}
            </button>

          </div>
        </div>

        <div className="col-lg-7 d-none d-lg-block p-0">
          <img src={salonImg}
            className="img-fluid h-100 w-100 object-fit-cover"
            alt="Register" />
        </div>

      </div>
    </div>
  )
}