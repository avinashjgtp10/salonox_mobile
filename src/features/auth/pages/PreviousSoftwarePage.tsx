import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/PreviousSoftwarePage.scss"

export default function PreviousSoftwarePage() {

  const navigate = useNavigate()

  const [selected, setSelected] = useState("")
  const [otherSoftware, setOtherSoftware] = useState("")

  const softwareList = [
    "Acuity",
    "Booksy",
    "Calendly",
    "Goldie",
    "Janeapp",
    "Mindbody",
    "Salon Iris",
    "Setmore",
    "Shortcuts",
    "Square",
    "Styleseat",
    "Timely",
    "Treatwell",
    "Vagaro",
    "Zenoti",
    "I'm not using any software",
    "Other"
  ]

  const handleContinue = () => {
    navigate("/recommendation-source")
  }

  return (
    <div className="software-container">

      {/* 🔥 PROGRESS BAR */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* LEFT SIDE */}
      <div className="software-left">

        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="software-content">

          <p className="setup-text">Account setup</p>

          <h1>Which software are you currently using?</h1>

          <p className="sub-text">
            If you're looking to switch, we can help speed up your business setup.
          </p>

          <div className="software-list">
            {softwareList.map((item, index) => (
              <label key={index} className="software-option">
                <input
                  type="radio"
                  name="software"
                  value={item}
                  checked={selected === item}
                  onChange={() => setSelected(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>

          {/* 🔥 SHOW INPUT IF OTHER SELECTED */}
          {selected === "Other" && (
            <div className="other-input-wrapper">

              <div className="other-label-row">
                <label>What other software?</label>
                <span>{otherSoftware.length}/30</span>
              </div>

              <input
                type="text"
                placeholder="Type software name"
                value={otherSoftware}
                maxLength={30}
                onChange={(e) => setOtherSoftware(e.target.value)}
                className={otherSoftware.length === 0 ? "error" : ""}
              />

              {otherSoftware.length === 0 && (
                <p className="error-text">
                  Other software is required
                </p>
              )}

            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="software-right">

        <div className="top-actions">

          <button
            className="close-btn"
            onClick={() => navigate("/dashboard")}
          >
            Close
          </button>

          <button
            className="continue-btn"
            disabled={
              !selected ||
              (selected === "Other" && otherSoftware.length === 0)
            }
            onClick={handleContinue}
          >
            Continue
            <FiArrowRight />
          </button>

        </div>

        <img src={salonImg} alt="Software" />

      </div>

    </div>
  )
}