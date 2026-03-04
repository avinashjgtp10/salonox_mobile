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
    <div className="container-fluid p-0">

      {/* Progress */}
      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-primary" style={{ width: "60%" }} />
      </div>

      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 bg-light p-5 position-relative">

          {/* Back Button */}
          <button
            className="btn btn-light border rounded-circle position-absolute"
            style={{ top: "30px", left: "40px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="mt-5" style={{ maxWidth: "480px" }}>

            <p className="text-muted small">Account setup</p>

            <h3 className="fw-bold mb-4">
              What's your team size
            </h3>

            <div className="d-flex flex-column gap-3">

              <div
                className={`card p-3 size-card ${
                  selected === "2-5" ? "active" : ""
                }`}
                onClick={() => setSelected("2-5")}
              >
                2–5 people
              </div>

              <div
                className={`card p-3 size-card ${
                  selected === "6-10" ? "active" : ""
                }`}
                onClick={() => setSelected("6-10")}
              >
                6–10 people
              </div>

              <div
                className={`card p-3 size-card ${
                  selected === "11+" ? "active" : ""
                }`}
                onClick={() => setSelected("11+")}
              >
                11+ people
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="col-lg-7 d-none d-lg-block position-relative">

          <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">

            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => navigate("/dashboard")}
            >
              Close
            </button>

            <button
              className="btn btn-dark rounded-pill"
              disabled={!selected}
              onClick={handleContinue}
            >
              Continue
              <FiArrowRight className="ms-2" />
            </button>

          </div>

          <img
            src={salonImg}
            alt="Team Setup"
            className="img-fluid w-100 h-100 object-fit-cover"
          />

        </div>

      </div>
    </div>
  )
}