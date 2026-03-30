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
    <div className="container-fluid p-0 bg-page min-vh-100">

      {/* PROGRESS BAR */}
      <div className="progress onboarding-progress" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "30%" }} />
      </div>

      {/* TOP NAVIGATION */}
      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">
        <button
          className="btn btn-outline-secondary rounded-pill bg-white px-4"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="btn btn-dark rounded-pill px-4 d-lg-none"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continue <FiArrowRight size={16} className="ms-1" />
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-md-6 left-panel d-flex flex-column px-5 position-relative bg-white">

          {/* Brand & Side Nav */}
          <div className="position-absolute top-0 start-0 p-4 pb-0 w-100">
            <div className="d-flex align-items-center justify-content-between">
              <h4 className="brand-logo m-0">salonox</h4>
              <button
                className="btn-back-circle d-md-flex d-none"
                onClick={() => navigate(-1)}
                title="Back"
              >
                <FiArrowLeft size={20} />
              </button>
            </div>
          </div>

          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="content-wrapper w-100" style={{ maxWidth: "480px" }}>
              <p className="onboarding-step-label mb-2">Account setup</p>
              <h2 className="account-heading mb-2">Select account type</h2>
              <p className="text-muted mb-4">This will help us set up your account correctly</p>

              <div className="row g-3">
                <div className="col-12">
                  <div
                    className={`card p-4 text-center premium-choice-card ${selected === "independent" ? "selected" : ""}`}
                    onClick={() => setSelected("independent")}
                  >
                    <div className="mb-2 fs-3 text-secondary"><FiUser /></div>
                    <strong className="fs-5">I'm an independent</strong>
                  </div>
                </div>
                <div className="col-12">
                  <div
                    className={`card p-4 text-center premium-choice-card ${selected === "team" ? "selected" : ""}`}
                    onClick={() => setSelected("team")}
                  >
                    <div className="mb-2 fs-3 text-secondary"><FiUsers /></div>
                    <strong className="fs-5">I have a team</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7 d-none d-lg-block p-0 position-relative overflow-hidden" style={{ minHeight: "100vh" }}>
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Desktop Continue Button on Image */}
          <div className="position-absolute top-0 end-0 p-4 z-3">
            <button
              className="btn btn-dark rounded-pill px-4"
              disabled={!selected}
              onClick={handleContinue}
            >
              Continue <FiArrowRight size={16} className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}