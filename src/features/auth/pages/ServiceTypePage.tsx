import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/ServiceTypePage.scss"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  ArrowRight, Scissors, Stars, Eye, Brush, PersonHeart,
  Droplet, ThermometerHalf, HeartPulse, PersonBadge, Lightning, People,
} from "react-bootstrap-icons"
import { useOnboarding } from "../../../context/OnboardingContext"
import salonImg from "../../../assets/images/salon.jpg"

export default function ServiceTypePage() {

  const navigate = useNavigate()
  const { update } = useOnboarding()

  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherValue, setOtherValue] = useState("")

  const categories = [
    { name: "Hair salon",            icon: <Scissors /> },
    { name: "Nails",                 icon: <Stars /> },
    { name: "Eyebrows & lashes",     icon: <Eye /> },
    { name: "Beauty salon",          icon: <Brush /> },
    { name: "Medspa",                icon: <PersonHeart /> },
    { name: "Barber",                icon: <Scissors /> },
    { name: "Massage",               icon: <Droplet /> },
    { name: "Spa & sauna",           icon: <ThermometerHalf /> },
    { name: "Waxing salon",          icon: <Droplet /> },
    { name: "Tattooing & piercing",  icon: <HeartPulse /> },
    { name: "Tanning studio",        icon: <PersonBadge /> },
    { name: "Fitness & recovery",    icon: <Lightning /> },
    { name: "Physical therapy",      icon: <HeartPulse /> },
    { name: "Health practice",       icon: <HeartPulse /> },
    { name: "Pet grooming",          icon: <People /> },
    { name: "Other",                 icon: <PersonBadge /> },
  ]

  const handleSelect = (name: string) => {
    setError("")
    if (selected.includes(name)) {
      setSelected(selected.filter(i => i !== name))
      if (name === "Other") setShowOtherInput(false)
      return
    }
    if (selected.length >= 3) {
      setError("You can select maximum 3 services.")
      return
    }
    setSelected([...selected, name])
    if (name === "Other") setShowOtherInput(true)
  }

  const handleContinue = () => {
    if (selected.length === 0) {
      setError("Please select at least one service.")
      return
    }
    if (selected.includes("Other") && otherValue.trim() === "") {
      setError("Please enter your other service type.")
      return
    }

    const business_type = selected[0] === "Other"
      ? otherValue.trim()
      : selected[0]

    update({ business_type })
    navigate("/team-setup")
  }

  return (
    <div className="container-fluid p-0 bg-light">

      <div className="progress rounded-0" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "40%" }} />
      </div>

      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3" style={{ pointerEvents: "none" }}>
        <button
          className="btn btn-outline-secondary rounded-pill bg-white px-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="btn btn-dark rounded-pill px-4 d-lg-none"
          style={{ pointerEvents: "auto" }}
          onClick={handleContinue}
        >
          Continue <ArrowRight size={16} className="ms-1" />
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-6 bg-white p-4 position-relative">

          <button className="btn back-btn" onClick={() => navigate(-1)}>←</button>

          <h4 className="fw-bold mt-5">
            Select categories that best describe your business
          </h4>
          <p className="text-muted mb-4">
            Choose your primary and up to 3 related service types
          </p>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="row g-3">
            {categories.map((item) => {
              const isSelected = selected.includes(item.name)
              const index = selected.indexOf(item.name)
              return (
                <div key={item.name} className="col-md-6">
                  <div
                    className={`card salonox-card p-3 ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelect(item.name)}
                  >
                    {isSelected && (
                      <span className="selection-badge">{index + 1}</span>
                    )}
                    {isSelected && index === 0 && (
                      <span className="primary-badge">Primary</span>
                    )}
                    <div className="d-flex align-items-center gap-3">
                      <div className="fs-5">{item.icon}</div>
                      <div>{item.name}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {showOtherInput && (
            <div className="mt-4">
              <label className="form-label fw-semibold">Other service type</label>
              <input
                type="text"
                className="form-control"
                value={otherValue}
                onChange={(e) => setOtherValue(e.target.value)}
              />
            </div>
          )}

          <button
            className="btn btn-dark w-100 rounded-pill mt-4"
            onClick={handleContinue}
          >
            Continue →
          </button>

        </div>

        <div className="col-lg-6 d-none d-lg-block position-relative p-0" style={{ minHeight: "100vh" }}>
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