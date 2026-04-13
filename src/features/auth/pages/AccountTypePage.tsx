import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AccountTypePage.scss";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

export default function AccountTypePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"new" | "join" | null>(null);

  const handleContinue = () => {
    if (selected === "new") navigate("/business-name");
    if (selected === "join") navigate("/join-business");
  };

  return (
    <div className="container-fluid p-0">
      {/* Progress bar */}
      <div className="progress rounded-0" style={{ height: "4px", background: "#f3f4f6" }}>
        <div className="progress-bar" style={{ width: "10%", background: "#111827" }} />
      </div>

      <div className="row g-0" style={{ minHeight: "calc(100vh - 4px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 d-flex align-items-center justify-content-center position-relative bg-white px-4 px-lg-5">
          <div className="w-100 account-wrapper">
            <p className="onboarding-step-label">Account setup &nbsp;·&nbsp; Step 1 of 8</p>
            <h2 className="account-heading mb-4">
              How would you like to set up your account?
            </h2>

            <div
              className={`card p-4 mb-3 account-card ${selected === "new" ? "border-dark bg-light" : ""}`}
              onClick={() => setSelected("new")}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Create a new business account</div>
                  <small className="text-muted">Set up your salon from scratch</small>
                </div>
                <FiArrowRight />
              </div>
            </div>

            <div
              className={`card p-4 account-card ${selected === "join" ? "border-dark bg-light" : ""}`}
              onClick={() => setSelected("join")}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Join an existing business on salonox</div>
                  <small className="text-muted">Find the business you want to join</small>
                </div>
                <FiArrowRight />
              </div>
            </div>

            {/* Mobile-only Continue button */}
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
          stats={[
            { value: "10K+", label: "Professionals" },
            { value: "4.9★", label: "App Rating" },
          ]}
          quote={{
            text: "Setting up on salonox was the best decision for my business this year. Everything just works.",
            author: "Sarah M.",
            role: "Hair Stylist, London",
          }}
        />
      </div>
    </div>
  );
}
