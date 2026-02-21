import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/TeamSizePage.scss"

export default function TeamSizePage() {

  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)

  const handleContinue = () => {
    if (!selected) return
    navigate("/business-location")
  }

  return (
    <div className="team-container">

      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      <div className="team-left">

        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="team-content">

          <p className="setup-text">Account setup</p>

          <h1>What's your team size</h1>

          <div className="team-size-list">

            <div
              className={`size-card ${selected === "2-5" ? "active" : ""}`}
              onClick={() => setSelected("2-5")}
            >
              2–5 people
            </div>

            <div
              className={`size-card ${selected === "6-10" ? "active" : ""}`}
              onClick={() => setSelected("6-10")}
            >
              6–10 people
            </div>

            <div
              className={`size-card ${selected === "11+" ? "active" : ""}`}
              onClick={() => setSelected("11+")}
            >
              11+ people
            </div>

          </div>

        </div>
      </div>

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