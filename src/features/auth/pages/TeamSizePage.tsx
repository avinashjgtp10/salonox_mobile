import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import "../styles/TeamSizePage.scss"
import { useOnboarding } from "../../../context/OnboardingContext"
import salonImg from "../../../assets/images/salon.jpg"

type TeamSize = "2-5" | "6-10" | "11+"

export default function TeamSizePage() {

  const navigate = useNavigate()
  const { update } = useOnboarding()
  const [selected, setSelected] = useState<TeamSize | null>(null)

  const handleContinue = () => {
    if (!selected) return
    update({ team_size: selected })
    navigate("/business-location")
  }

  const sizes: TeamSize[] = ["2-5", "6-10", "11+"]

  return (
    <div className="container-fluid p-0">

      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-dark" style={{ width: "60%" }} />
      </div>

      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">
        <button
          className="btn btn-outline-secondary rounded-pill bg-white"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="btn btn-dark rounded-pill"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continue <FiArrowRight className="ms-2" />
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-12 bg-light p-5 position-relative">

          <button
            className="btn btn-light border rounded-circle position-absolute"
            style={{ top: "30px", left: "40px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="mt-5" style={{ maxWidth: "480px" }}>
            <p className="text-muted small">Account setup</p>
            <h3 className="fw-bold mb-4">What's your team size?</h3>

            <div className="d-flex flex-column gap-3">
              {sizes.map((size) => (
                <div
                  key={size}
                  className={`card p-3 size-card ${selected === size ? "active" : ""}`}
                  onClick={() => setSelected(size)}
                >
                  {size} people
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-7 d-none d-lg-block position-relative p-0" style={{ minHeight: "100vh" }} >
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