import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import "../styles/BusinessLocationPage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

type LocationType = "physical" | "mobile" | "virtual";

const options: { id: LocationType; label: string; sub: string }[] = [
  {
    id: "physical",
    label: "Clients come to me",
    sub: "At a physical salon, studio or clinic",
  },
  {
    id: "mobile",
    label: "I go to my clients",
    sub: "As a mobile or travelling professional",
  },
  {
    id: "virtual",
    label: "Virtual services",
    sub: "Consultations, coaching or online sessions",
  },
];

export default function BusinessLocationPage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<LocationType | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    update({ location_type: selected });
    if (selected === "physical") navigate("/venue-location");
    else navigate("/previous-software");
  };

  return (
    <div className="container-fluid p-0">
      {/* Progress bar */}
      <div className="progress rounded-0" style={{ height: "4px", background: "#f3f4f6" }}>
        <div className="progress-bar" style={{ width: "70%", background: "#111827" }} />
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
            <div className="account-wrapper">
              <p className="onboarding-step-label mb-1">Account setup &nbsp;·&nbsp; Step 6 of 8</p>
              <h3 className="account-heading mb-2">Where do you provide your services?</h3>
              <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
                Choose the option that best describes how you work.
              </p>

              <div className="d-grid gap-3">
                {options.map((item) => (
                  <div
                    key={item.id}
                    className={`card position-relative onboarding-choice-card ${selected === item.id ? "selected" : ""}`}
                    onClick={() => setSelected(item.id)}
                  >
                    <div>
                      <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>{item.label}</div>
                      <div className="text-muted" style={{ fontSize: "13px", marginTop: "2px" }}>{item.sub}</div>
                    </div>
                    {selected === item.id && (
                      <div className="check-icon-wrapper">
                        <FiCheck size={18} />
                      </div>
                    )}
                  </div>
                ))}
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
            text: "Walk-ins, online bookings, and virtual consultations — all perfectly organised in one place.",
            author: "Ayesha K.",
            role: "Nail Technician & Educator",
          }}
        />
      </div>
    </div>
  );
}
