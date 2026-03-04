import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/BusinessNamePage.scss"

export default function BusinessNamePage() {

  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState("")
  const [website, setWebsite] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const isValid = businessName.trim().length >= 3

  const handleContinue = () => {
    setSubmitted(true)
    if (!isValid) return
    navigate("/service-type")
  }

  return (
    <div className="container-fluid p-0">

      {/* ✅ Bootstrap Progress Bar (Thin like image) */}
      <div className="progress rounded-0" style={{ height: "4px" }}>
  <div className="progress-bar bg-dark" style={{ width: "30%" }}></div>
</div>

      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 bg-light d-flex align-items-center justify-content-center p-4 position-relative">

          {/* Back Button */}
          <button
            className="btn btn-outline-secondary rounded-circle position-absolute"
            style={{ top: "30px", left: "30px", width: "44px", height: "44px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="card shadow-sm p-4 w-100" style={{ maxWidth: "480px" }}>

            <p className="text-muted small mb-2">Account setup</p>

            <h4 className="fw-bold mb-2">What’s your business name?</h4>

            <p className="text-muted small mb-4">
              This is the brand name your clients will see.
              Your billing and legal name can be added later.
            </p>

            {/* Business Name */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Business name *
              </label>

              <input
                type="text"
                className={`form-control ${
                  submitted && !isValid ? "is-invalid" : ""
                }`}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />

              {submitted && !isValid && (
                <div className="invalid-feedback">
                  Business name must be at least 3 characters
                </div>
              )}
            </div>

            {/* Website */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Website (Optional)
              </label>

              <input
                type="text"
                placeholder="www.yoursite.com"
                className="form-control"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {/* Continue */}
            <button
              className="btn btn-dark w-100 rounded-pill"
              onClick={handleContinue}
            >
              Continue →
            </button>

          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="col-lg-7 d-none d-lg-block position-relative">

          <img
            src={salonImg}
            alt="Business Setup"
            className="img-fluid w-100 h-100 object-fit-cover"
          />

        </div>

      </div>
    </div>
  )
}