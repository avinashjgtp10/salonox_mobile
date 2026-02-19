import "../styles/ServiceTypePage.scss"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import salonImg from "../../../assets/images/salon.jpg"

import {
  FaCut,
  FaHandSparkles,
  FaEye,
  FaSpa,
  FaUserTie,
  FaHotTub,
  FaDumbbell,
  FaHeartbeat
} from "react-icons/fa"

import { GiLipstick, GiRazor } from "react-icons/gi"
import { MdOutlineFaceRetouchingNatural } from "react-icons/md"

export default function ServiceTypePage() {

  const navigate = useNavigate()

  const [selected, setSelected] = useState<string[]>([])
  const [showError, setShowError] = useState(false)   // ✅ MISSING STATE ADDED

  const categories = [
    { name: "Hair salon", icon: <FaCut /> },
    { name: "Nails", icon: <FaHandSparkles /> },
    { name: "Eyebrows & lashes", icon: <FaEye /> },
    { name: "Beauty salon", icon: <GiLipstick /> },
    { name: "Medspa", icon: <MdOutlineFaceRetouchingNatural /> },
    { name: "Barber", icon: <GiRazor /> },
    { name: "Massage", icon: <FaSpa /> },
    { name: "Spa & sauna", icon: <FaHotTub /> },
    { name: "Waxing salon", icon: <FaSpa /> },
    { name: "Tattooing & piercing", icon: <FaHeartbeat /> },
    { name: "Tanning studio", icon: <FaUserTie /> },
    { name: "Fitness & recovery", icon: <FaDumbbell /> },
    { name: "Physical therapy", icon: <FaHeartbeat /> },
    { name: "Health practice", icon: <FaHeartbeat /> },
    { name: "Pet grooming", icon: <FaSpa /> },
    { name: "Other", icon: <FaUserTie /> }
  ]

  const toggleCategory = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter(item => item !== name))
      return
    }
    if (selected.length >= 3) return
    setSelected([...selected, name])
  }

  const handleContinue = () => {
    if (selected.length === 0) {
      setShowError(true)
      return
    }
    navigate("/team-setup")
  }

  return (
    <div className="service-container">

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* Error Toast */}
      {showError && (
        <div className="error-toast">
          Please select your service types
          <span onClick={() => setShowError(false)}>✕</span>
        </div>
      )}

      {/* Back Button */}
      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* LEFT SIDE */}
      <div className="service-left">
        <div className="service-content">

          <p className="setup-text">Account setup</p>

          <h1>Select categories that best describe your business</h1>

          <p className="sub-text">
            Choose your primary and up to 3 related service types
          </p>

          <div className="category-grid">
            {categories.map((item) => (
              <div
                key={item.name}
                className={`category-card 
                  ${selected.includes(item.name) ? "active" : ""} 
                  ${selected.length >= 3 && !selected.includes(item.name) ? "disabled" : ""}
                `}
                onClick={() => {
                  if (selected.length >= 3 && !selected.includes(item.name)) return
                  toggleCategory(item.name)
                }}
              >
                {selected.includes(item.name) && (
                  <div className="badge">
                    {selected.indexOf(item.name) + 1}
                  </div>
                )}

                <div className="icon">{item.icon}</div>
                <p>{item.name}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="service-right">

        <button
          className="continue-top-btn"
          onClick={handleContinue}
        >
          Continue →
        </button>

        <img src={salonImg} alt="Service Setup" />
      </div>

    </div>
  )
}
