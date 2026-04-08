import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiUser, FiUsers } from "react-icons/fi"
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



      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-md-6 left-panel d-flex flex-column px-5 position-relative bg-white">

          <button
            className="btn btn-outline-secondary rounded-circle position-absolute"
            style={{ top: "30px", left: "30px", width: "44px", height: "44px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="content-wrapper w-100" style={{ maxWidth: "480px" }}>
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

              <button
                className="btn btn-dark w-100 rounded-pill mt-4"
                disabled={!selected}
                onClick={handleContinue}
              >
                Continue →
              </button>
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


        </div>
      </div>
    </div>
  )
}