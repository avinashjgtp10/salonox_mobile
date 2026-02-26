import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"

export default function RecommendationSourcePage() {

  const navigate = useNavigate()
  const [selected, setSelected] = useState("")
  const [otherText, setOtherText] = useState("")
  const [submitted, setSubmitted] = useState(false)

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
    setSubmitted(true)

    if (!selected) return
    if (selected === "Other" && otherText.trim() === "") return

    navigate("/setup-complete")
  }

  return (
    <div className="container-fluid p-0 position-relative">

      {/* 🔵 Bootstrap Progress Bar */}
      <div className="progress rounded-0" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "100%" }} />
      </div>

      {/* 🔹 Top Right Buttons */}
      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3">

        <button
          className="btn btn-outline-secondary rounded-pill"
          onClick={() => navigate("/dashboard")}
        >
          Close
        </button>

        <button
          className="btn btn-dark rounded-pill"
          disabled={
            !selected ||
            (selected === "Other" && otherText.trim() === "")
          }
          onClick={handleDone}
        >
          Done
        </button>

      </div>

      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 bg-white p-5">

          {/* Back Button */}
          <button
            className="btn btn-light border rounded-circle mb-4"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div style={{ maxWidth: "420px" }}>

            <p className="text-muted small">Account setup</p>

            <h4 className="fw-bold mb-4">
              How did you hear about Fresha?
            </h4>

            {/* Bootstrap Pills */}
            {options.map((item, index) => (
              <button
                key={index}
                className={`btn w-100 text-start rounded-pill mb-3 ${
                  selected === item
                    ? "border-2 border-primary bg-white"
                    : "border bg-light"
                }`}
                onClick={() => {
                  setSelected(item)
                  setSubmitted(false)
                }}
              >
                {item}
              </button>
            ))}

            {/* OTHER INPUT */}
            {selected === "Other" && (
              <div className="mt-3">

                <div className="d-flex justify-content-between mb-1">
                  <label className="form-label">
                    Please specify
                  </label>
                  <small>{otherText.length}/255</small>
                </div>

                <input
                  type="text"
                  maxLength={255}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className={`form-control ${
                    submitted && otherText.trim() === ""
                      ? "is-invalid"
                      : ""
                  }`}
                />

                {submitted && otherText.trim() === "" && (
                  <div className="invalid-feedback d-block">
                    This field is required
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="col-lg-7 d-none d-lg-block p-0">

          <img
            src={salonImg}
            alt="Recommendation"
            className="img-fluid w-100 vh-100"
            style={{ objectFit: "cover" }}
          />

        </div>

      </div>
    </div>
  )
}
