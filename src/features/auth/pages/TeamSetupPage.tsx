import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiUser, FiUsers } from "react-icons/fi";
import "../styles/TeamSetupPage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

export default function TeamSetupPage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<"independent" | "team" | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    update({ team_type: selected });
    if (selected === "independent") navigate("/business-location");
    else navigate("/team-size");
  };

  return (
    <div className="container-fluid p-0 bg-page min-vh-100">
      {/* Progress bar */}
      <div className="progress rounded-0" style={{ height: "4px", background: "#f3f4f6" }}>
        <div className="progress-bar" style={{ width: "50%", background: "#111827" }} />
      </div>

      <div className="row g-0" style={{ minHeight: "calc(100vh - 4px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 left-panel d-flex flex-column px-4 px-lg-5 position-relative bg-white">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "24px", left: "24px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="w-100" style={{ maxWidth: "420px" }}>
              <p className="onboarding-step-label mb-1">Account setup &nbsp;·&nbsp; Step 4 of 8</p>
              <h3 className="account-heading mb-2" style={{ fontSize: "26px" }}>Select your account type</h3>
              <p className="account-subheading mb-4">
                This helps us personalise the tools and features for you.
              </p>

              <div className="d-flex flex-column gap-3">
                <div
                  className={`card p-4 premium-choice-card d-flex flex-row align-items-center gap-3 ${selected === "independent" ? "selected" : ""}`}
                  onClick={() => setSelected("independent")}
                >
                  <div className="choice-icon-bg flex-shrink-0">
                    <FiUser size={20} />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>I'm an independent</div>
                    <div className="text-muted" style={{ fontSize: "13px" }}>Solo professional or freelancer</div>
                  </div>
                </div>

                <div
                  className={`card p-4 premium-choice-card d-flex flex-row align-items-center gap-3 ${selected === "team" ? "selected" : ""}`}
                  onClick={() => setSelected("team")}
                >
                  <div className="choice-icon-bg flex-shrink-0">
                    <FiUsers size={20} />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>I have a team</div>
                    <div className="text-muted" style={{ fontSize: "13px" }}>Manage staff, schedules & payroll</div>
                  </div>
                </div>
              </div>

              {/* Mobile continue button */}
              <button
                className="btn btn-dark rounded-pill w-100 mt-4 d-lg-none"
                style={{ height: "52px", fontWeight: 600 }}
                disabled={!selected}
                onClick={handleContinue}
              >
                Continue <FiArrowRight size={16} className="ms-1" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          continueBtn={
            <button
              className="btn btn-light rounded-pill px-4 fw-semibold"
              disabled={!selected}
              onClick={handleContinue}
              style={{ fontSize: "14px" }}
            >
              Continue <FiArrowRight size={14} className="ms-1" />
            </button>
          }
          quote={{
            text: "Managing my team of 8 stylists has never been this smooth. The scheduling tools are a game-changer.",
            author: "Rachel T.",
            role: "Spa Manager, Dubai",
          }}
        />
      </div>
    </div>
  );
}
