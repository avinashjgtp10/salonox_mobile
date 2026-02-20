import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/BusinessLocationPage.scss"

export default function BusinessLocationPage() {

  const navigate = useNavigate()

  // ✅ MULTIPLE SELECT STATE
  const [selected, setSelected] = useState<string[]>([])

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      // Remove if already selected
      setSelected(selected.filter(item => item !== id))
    } else {
      // Add if not selected
      setSelected([...selected, id])
    }
  }

  const handleContinue = () => {
    if (selected.length === 0) return

    // Example logic
    if (selected.includes("physical")) {
      navigate("/venue-location")
    } else {
      navigate("/previous-software")
    }
  }

  const options = [
    { id: "physical", label: "Clients come to me at a physical location" },
    { id: "mobile", label: "I visit my clients as a mobile operator" },
    { id: "virtual", label: "I provide virtual services online" }
  ]

  return (
    <div className="location-container">

      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      <div className="location-left">

        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="location-content">

          <p className="setup-text">Account setup</p>
          <h1>Where do you provide your services?</h1>

          <div className="location-options">
            {options.map((item) => (
              <div
                key={item.id}
                className={`location-card ${
                  selected.includes(item.id) ? "active" : ""
                }`}
                onClick={() => toggleOption(item.id)}
              >
                <p>{item.label}</p>

                {selected.includes(item.id) && (
                  <div className="check-icon">
                    <FiCheck />
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="location-right">

        <div className="top-actions">

          <button
            className="close-btn"
            onClick={() => navigate("/dashboard")}
          >
            Close
          </button>

          <button
            className="continue-btn"
            disabled={selected.length === 0}
            onClick={handleContinue}
          >
            Continue
            <FiArrowRight />
          </button>

        </div>

        <img src={salonImg} alt="Business Location" />

      </div>6
    </div>
  )
}