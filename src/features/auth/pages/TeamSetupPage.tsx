import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight, FiUser, FiUsers } from "react-icons/fi"
import "../styles/TeamSetupPage.scss"
import { useOnboarding } from "../../../context/OnboardingContext"
import salonImg from "../../../assets/images/salon.jpg"

export default function TeamSetupPage() {

  const navigate = useNavigate()
  const { update } = useOnboarding()
  const [selected, setSelected] = useState<"independent" | "team" | null>(null)

  const handleContinue = () => {
    if (!selected) return
    update({ team_type: selected })
    if (selected === "independent") navigate("/business-location")
    else navigate("/team-size")
  }

  return (
    <div className="container-fluid p-0">

      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-dark" style={{ width: "65%" }} />
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
            style={{ top: "25px", left: "40px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="mt-5" style={{ maxWidth: "480px" }}>
            <p className="text-muted small">Account setup</p>
            <h3 className="fw-bold mb-2">Select account type</h3>
            <p className="text-muted mb-4">This will help us set up your account correctly</p>

            <div className="row g-3">
              <div className="col-12">
                <div
                  className={`card p-4 team-card ${selected === "independent" ? "active" : ""}`}
                  onClick={() => setSelected("independent")}
                >
                  <div className="mb-3 fs-4"><FiUser /></div>
                  <strong>I'm an independent</strong>
                </div>
              </div>
              <div className="col-12">
                <div
                  className={`card p-4 team-card ${selected === "team" ? "active" : ""}`}
                  onClick={() => setSelected("team")}
                >
                  <div className="mb-3 fs-4"><FiUsers /></div>
                  <strong>I have a team</strong>
                </div>
              </div>
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