import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft } from "react-icons/fi"
import "../styles/BusinessNamePage.scss"
import salonImg from "../../../assets/images/salon.jpg"

export default function BusinessNamePage() {

  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState("")
  const [website, setWebsite] = useState("")
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const validate = () => {
    if (!businessName.trim()) {
      setError("Business name is required")
      return false
    }

    if (businessName.trim().length < 3) {
      setError("Business name must be at least 3 characters")
      return false
    }

    setError("")
    return true
  }

  const handleContinue = () => {
    setSubmitted(true)
    if (!validate()) return
    navigate("/service-type")
  }

  return (
    <div className="business-container">

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* LEFT SIDE */}
      <div className="business-left">

        {/* Circle Back Button */}
        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="business-content">

          <p className="setup-text">Account setup</p>

          <h1>What’s your business name?</h1>

          <p className="sub-text">
            This is the brand name your clients will see.
            Your billing and legal name can be added later.
          </p>

          {/* Business Name */}
          <div className="input-group">
            <label>Business name *</label>

            <input
              type="text"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value)
                if (error) setError("")
              }}
              className={submitted && error ? "error-border" : ""}
            />

            {submitted && error && (
              <p className="error">{error}</p>
            )}
          </div>

          {/* Website */}
          <div className="input-group">
            <label>Website (Optional)</label>

            <input
              type="text"
              placeholder="www.yoursite.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* Continue Button */}
          <button
            className="continue-btn"
            onClick={handleContinue}
          >
            Continue →
          </button>

        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="business-right">
        <img src={salonImg} alt="Business Setup" />
      </div>

    </div>
  )
}