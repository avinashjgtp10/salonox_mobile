import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "../styles/PreviousSoftwarePage.scss";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

export default function PreviousSoftwarePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");
  const [otherSoftware, setOtherSoftware] = useState("");

  const softwareList = [
    "Acuity",
    "Booksy",
    "Calendly",
    "Goldie",
    "Janeapp",
    "Mindbody",
    "Salon Iris",
    "Setmore",
    "Shortcuts",
    "Square",
    "Styleseat",
    "Timely",
    "Treatwell",
    "Vagaro",
    "Zenoti",
    "I'm not using any software",
    "Other",
  ];

  const handleContinue = () => {
    navigate("/recommendation-source");
  };

  return (
    <div className="container-fluid p-0">
      {/* Progress bar */}
      <div className="progress rounded-0" style={{ height: "4px", background: "#f3f4f6" }}>
        <div className="progress-bar" style={{ width: "80%", background: "#111827" }} />
      </div>

      <div className="row g-0" style={{ minHeight: "calc(100vh - 4px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 bg-white p-4 p-lg-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "24px", left: "24px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div style={{ maxWidth: "420px" }} className="mt-4">
            <p className="onboarding-step-label mb-1">Account setup &nbsp;·&nbsp; Step 7 of 8</p>
            <h3 className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827", letterSpacing: "-0.02em" }}>
              Which software do you currently use?
            </h3>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              We can help speed up your setup if you're switching.
            </p>

            <div className="d-grid gap-2">
              {softwareList.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={`btn software-btn ${selected === item ? "active" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {selected === "Other" && (
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                    What other software?
                  </label>
                  <small className="text-muted">{otherSoftware.length}/30</small>
                </div>
                <input
                  type="text"
                  className={`form-control ${otherSoftware.length === 0 ? "is-invalid" : ""}`}
                  placeholder="Type software name"
                  value={otherSoftware}
                  maxLength={30}
                  onChange={(e) => setOtherSoftware(e.target.value)}
                  style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb" }}
                />
                {otherSoftware.length === 0 && (
                  <div className="invalid-feedback d-block">Other software is required</div>
                )}
              </div>
            )}

            {/* Mobile continue button */}
            <button
              className="btn btn-dark w-100 rounded-pill mt-4 d-lg-none"
              style={{ height: "52px", fontWeight: 600 }}
              disabled={!selected || (selected === "Other" && otherSoftware.length === 0)}
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
              disabled={!selected || (selected === "Other" && otherSoftware.length === 0)}
              onClick={handleContinue}
              style={{ fontSize: "14px" }}
            >
              Continue <FiArrowRight size={14} className="ms-1" />
            </button>
          }
          quote={{
            text: "Switching from Booksy took less than 10 minutes. Wish I'd done it sooner.",
            author: "Tom H.",
            role: "Fitness & Wellness Coach",
          }}
        />
      </div>
    </div>
  );
}
