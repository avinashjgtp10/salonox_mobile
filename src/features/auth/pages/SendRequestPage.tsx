import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/SendRequestPage.scss"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"

export default function SendRequestPage() {

  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {

    if (message.length > 100) {
      setError("Message cannot exceed 100 characters.")
      return
    }

    setError("")
    navigate("/request-success")
  }

  return (
    <div className="container-fluid p-0 send-page">

      {/* Progress */}
      <div className="progress rounded-0 progress-top">
        <div className="progress-bar progress-fill"></div>
      </div>

      {/* Top Right Buttons */}
      <div className="top-buttons d-flex gap-3">
        <button
          className="btn btn-outline-secondary rounded-pill"
          onClick={() => navigate("/dashboard")}
        >
          Close
        </button>

        <button
          className="btn btn-dark rounded-pill"
          onClick={handleSubmit}
        >
          Send request
        </button>
      </div>

      <div className="row g-0 min-vh-100">

        {/* LEFT */}
        <div className="col-lg-5 col-12 left-panel d-flex flex-column">

          <div className="p-4">
            <div className="back-circle" onClick={() => navigate(-1)}>
              <FiArrowLeft />
            </div>
          </div>

          <div className="flex-grow-1 d-flex align-items-start justify-content-center pt-4">
            <div className="content-wrapper">

              <h2 className="page-heading mb-4">
                Send a request to join <br />
                DevoteTattoos
              </h2>

              <label className="form-label fw-semibold">
                Add a message <span className="text-muted">(Optional)</span>
              </label>

              <div className="d-flex justify-content-between small mb-2">
                {error && <span className="text-danger">{error}</span>}
                <span className="text-muted">{message.length}/100</span>
              </div>

              <textarea
                className={`form-control custom-textarea ${error ? "is-invalid" : ""}`}
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  if (e.target.value.length <= 100) {
                    setError("")
                  }
                }}
              />

            </div>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="col-lg-7 d-none d-lg-block p-0">
          <img
            src={salonImg}
            alt="Send Request"
            className="right-image"
          />
        </div>

      </div>
    </div>
  )
}