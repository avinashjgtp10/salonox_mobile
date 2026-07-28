import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import "../styles/TeamSizePage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

type TeamSize = "2-5" | "6-10" | "11+";

const sizeDetails: { value: TeamSize; label: string; sub: string }[] = [
  { value: "2-5", label: "2 – 5 people", sub: "Small & growing staff" },
  { value: "6-10", label: "6 – 10 people", sub: "Established staff" },
  { value: "11+", label: "11+ people", sub: "Large or multi-location staff" },
];

export default function TeamSizePage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<TeamSize | null>(null);

  useAutoNavigate(!!selected, () => {
    update({ team_size: selected! });
    navigate("/business-location");
  }, 500);

  return (
    <div className="container-fluid p-0 bg-page h-100">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
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
              <h3 className="account-heading mb-2" style={{ fontSize: "26px" }}>What's your staff size?</h3>
              <p className="account-subheading mb-4">
                We'll recommend the right plan for your staff.
              </p>

              <div className="d-flex flex-column gap-3">
                {sizeDetails.map(({ value, label, sub }) => (
                  <div
                    key={value}
                    className={`card premium-choice-card p-4 d-flex flex-row align-items-center justify-content-between ${selected === value ? "selected" : ""}`}
                    onClick={() => setSelected(value)}
                  >
                    <div>
                      <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>{label}</div>
                      <div className="text-muted" style={{ fontSize: "13px" }}>{sub}</div>
                    </div>
                    {selected === value && (
                      <FiCheck size={20} style={{ color: "#111827", flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>

              <AutoNavigateIndicator visible={!!selected} className="justify-content-center" />
            </div>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          quote={{
            text: "Growing from 2 to 12 stylists was painless. salonox scaled with us every step of the way.",
            author: "David L.",
            role: "Salon Owner, Sydney",
          }}
        />
      </div>
    </div>
  );
}
