import "./RegisterPage.scss"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { Country } from "country-state-city"

export default function RegisterPage() {

  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    address: "",
    email: "",
    country: "India",
    countryCode: "+91",
    phone: "",
    password: ""
  })

  const [errors, setErrors] = useState<any>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const validate = () => {
    const newErrors: any = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/

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

    if (!form.phone)
      newErrors.phone = "Mobile number is required"

    if (!form.password.trim())
      newErrors.password = "Password is required"
    else if (!passwordRegex.test(form.password))
      newErrors.password =
        "Password must be 6+ characters with 1 uppercase & 1 number"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = () => {
    if (!validate()) return

    console.log(form)
    alert("Registration Successful (Demo)")
    navigate("/")
  }

  return (
    <div className="register-container">
      <div className="card">

        <h2>Create Your Account</h2>
        <p className="sub">Sign up and manage your business</p>

        {/* FULL NAME */}
        <div className="field">
          <label>Full Name *</label>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
          />
          {errors.fullName && <p className="error">{errors.fullName}</p>}
        </div>

        {/* BUSINESS NAME */}
        <div className="field">
          <label>Business Name *</label>
          <input
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
          />
          {errors.businessName && <p className="error">{errors.businessName}</p>}
        </div>

        {/* ADDRESS */}
        <div className="field">
          <label>Address *</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          {errors.address && <p className="error">{errors.address}</p>}
        </div>

        {/* EMAIL */}
        <div className="field">
          <label>Email *</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        {/* COUNTRY DROPDOWN - ALL COUNTRIES */}
        <div className="field">
          <label>Country *</label>
          <select
            name="country"
            value={form.country}
            onChange={handleChange}
          >
           {Country.getAllCountries().map((country) => (
  <option key={country.isoCode} value={country.name}>
    {country.name}
  </option>
))}

          </select>
        </div>

        {/* PHONE WITH FLAG + COUNTRY CODE */}
        <div className="field">
          <label>Mobile Number *</label>
          <PhoneInput
            country="in"
            enableSearch
            value={form.phone}
            onChange={(value, data: any) =>
              setForm({
                ...form,
                phone: value,
                countryCode: "+" + data.dialCode
              })
            }
            inputClass="phone-input"
            containerClass="phone-container"
          />
          {errors.phone && <p className="error">{errors.phone}</p>}
        </div>

        {/* PASSWORD */}
        <div className="field">
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>

        <button className="signup-btn" onClick={handleRegister}>
          Create Account
        </button>

        <p className="login-link">
          Already have an account? <Link to="/">Log In</Link>
        </p>

      </div>
    </div>
  )
}
