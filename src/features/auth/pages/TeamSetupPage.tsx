import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight, FiUser, FiUsers } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/TeamSetupPage.scss"

export default function TeamSetupPage() {

  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)

  const handleContinue = () => {
    if (!selected) return
    navigate("/business-location")
  }

  return (
    <div className="team-container">

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* LEFT SIDE */}
      <div className="team-left">

        {/* Back Button */}
        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="team-content">

          <p className="setup-text">Account setup</p>

          <h1>Select account type</h1>

          <p className="sub-text">
            This will help us set up your account correctly
          </p>

          <div className="team-grid">

            <div
              className={`team-card ${selected === "independent" ? "active" : ""}`}
              onClick={() => setSelected("independent")}
            >
              <div className="card-icon">
                <FiUser />
              </div>
              <p>I'm an independent</p>
            </div>

            <div
              className={`team-card ${selected === "team" ? "active" : ""}`}
              onClick={() => setSelected("team")}
            >
              <div className="card-icon">
                <FiUsers />
              </div>
              <p>I have a team</p>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="team-right">

        <div className="top-actions">

          <button
            className="close-btn"
            onClick={() => navigate("/dashboard")}
          >
            Close
          </button>

          <button
            className="circle-continue-btn"
            disabled={!selected}
            onClick={handleContinue}
          >
            Continue
            <FiArrowRight size={16} />
          </button>

        </div>

        <img src={salonImg} alt="Team Setup" />
      </div>

    </div>
  )
}
