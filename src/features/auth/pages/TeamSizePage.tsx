import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import "../styles/TeamSizePage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import salonImg from "../../../assets/images/salon.jpg";

type TeamSize = "2-5" | "6-10" | "11+";

export default function TeamSizePage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<TeamSize | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    update({ team_size: selected });
    navigate("/business-location");
  };

  const sizes: TeamSize[] = ["2-5", "6-10", "11+"];

  return (
    <div className="container-fluid p-0 bg-page min-vh-100">
      {/* PROGRESS BAR */}
      <div className="progress onboarding-progress" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "60%" }} />
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-md-6 left-panel d-flex flex-column px-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-md-flex align-items-center justify-content-center"
            style={{ top: "30px", left: "50px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>


          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div
              className="content-wrapper w-100"
              style={{ maxWidth: "480px" }}
            >
              <p className="onboarding-step-label mb-2">Account setup</p>
              <h2 className="account-heading mb-4">What's your team size?</h2>

              <div className="d-flex flex-column gap-3">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className={`card premium-choice-card p-3 flex-row align-items-center justify-content-between ${selected === size ? "selected" : ""}`}
                    onClick={() => setSelected(size)}
                  >
                    <span className="fw-bold">{size} people</span>
                    {selected === size && (
                      <FiCheck className="text-dark" size={20} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="col-lg-7 col-md-6 d-none d-md-block position-relative p-0 overflow-hidden"
          style={{ minHeight: "100vh" }}
        >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />
          <div className="right-overlay-soft" />

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
  );
}
