import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/RecommendationSourcePage.scss"

export default function RecommendationSourcePage() {

  const navigate = useNavigate()

  const [selected, setSelected] = useState("")
  const [otherText, setOtherText] = useState("")

  const options = [
    "Recommended by a friend",
    "Search engine (e.g. Google, Bing)",
    "Social media",
    "Advert in the mail",
    "Magazine ad",
    "Ratings website (e.g. Capterra, Trustpilot)",
    "AI Chatbot (e.g. ChatGPT, Gemini, DeepSeek)",
    "Other"
  ]

  const handleDone = () => {
    navigate("/setup-complete")
  }

  return (
    <div className="recommend-container">

      {/* 🔥 PROGRESS BAR */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* LEFT SIDE */}
      <div className="recommend-left">

        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="recommend-content">

          <p className="setup-text">Account setup</p>

          <h1>How did you hear about Fresha?</h1>

          <div className="recommend-list">
            {options.map((item, index) => (
              <label key={index} className="recommend-option">
                <input
                  type="radio"
                  name="source"
                  value={item}
                  checked={selected === item}
                  onChange={() => setSelected(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>

          {/* 🔥 SHOW INPUT WHEN OTHER SELECTED */}
          {selected === "Other" && (
            <div className="other-wrapper">

              <div className="other-label-row">
                <label>Please specify</label>
                <span>{otherText.length}/255</span>
              </div>

              <input
                type="text"
                placeholder="Type your answer here"
                value={otherText}
                maxLength={255}
                onChange={(e) => setOtherText(e.target.value)}
              />

            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="recommend-right">

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
              (selected === "Other" && otherText.length === 0)
            }
            onClick={handleDone}
          >
            Done
          </button>

        </div>

        <img src={salonImg} alt="Recommendation" />

      </div>

    </div>
  )
}