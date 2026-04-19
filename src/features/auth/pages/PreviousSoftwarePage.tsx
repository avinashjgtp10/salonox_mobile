import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/PreviousSoftwarePage.scss";
import "../styles/onboarding-shared.scss";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

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

  const isValid = !!selected && !(selected === "Other" && otherSoftware.trim() === "");

  useAutoNavigate(isValid, () => navigate("/recommendation-source"), 500);

  return (
    <OnboardingPageWrapper>
      {/* LEFT PANEL */}
      <div className="col-lg-5 col-12 bg-white p-4 p-lg-5 position-relative">
        <OnboardingBackButton />

        <div className="ob-content-max mt-4">
          <h3 className="ob-heading mb-1">Which software do you currently use?</h3>
          <p className="ob-subtext mb-4">
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
                <label className="ob-label">What other software?</label>
                <small className="text-muted">{otherSoftware.length}/30</small>
              </div>
              <input
                type="text"
                className={`ob-input ${otherSoftware.length === 0 ? "is-invalid" : ""}`}
                placeholder="Type software name"
                value={otherSoftware}
                maxLength={30}
                onChange={(e) => setOtherSoftware(e.target.value)}
              />
              {otherSoftware.length === 0 && (
                <div className="invalid-feedback d-block ob-invalid-msg">
                  Other software is required
                </div>
              )}
            </div>
          )}

          <AutoNavigateIndicator visible={isValid} />
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <OnboardingImagePanel
        quote={{
          text: "Switching from Booksy took less than 10 minutes. Wish I'd done it sooner.",
          author: "Tom H.",
          role: "Fitness & Wellness Coach",
        }}
      />
    </OnboardingPageWrapper>
  );
}
