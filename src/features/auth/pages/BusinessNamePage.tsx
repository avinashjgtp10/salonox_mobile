import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import "../styles/BusinessNamePage.scss";
import "../styles/onboarding-shared.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";

export default function BusinessNamePage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValid = businessName.trim().length >= 3;

  const handleContinue = () => {
    setSubmitted(true);
    if (!isValid) return;
    update({
      business_name: businessName.trim(),
      website_url: website.trim(),
    });
    navigate("/service-type");
  };

  return (
    <OnboardingPageWrapper>
      {/* LEFT PANEL */}
      <div className="col-lg-5 col-12 bg-white d-flex align-items-center justify-content-center p-4 p-lg-5 position-relative">
        <OnboardingBackButton />

        <div className="ob-content-max">
          <h3 className="ob-heading mb-1">What's your business name?</h3>
          <p className="ob-subtext mb-4">
            This is the brand name your clients will see. Your billing and legal name can be added later.
          </p>

          <div className="mb-3">
            <label className="ob-label">
              Business name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`ob-input ${submitted && !isValid ? "is-invalid" : ""}`}
              placeholder="e.g. Glamour Salon"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            {submitted && !isValid && (
              <div className="invalid-feedback d-block ob-invalid-msg">
                Business name must be at least 3 characters
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="ob-label">
              Website <span className="text-muted fw-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="www.yoursite.com"
              className="ob-input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <button className="ob-btn-primary w-100" onClick={handleContinue}>
            Continue <FiArrowRight size={14} className="ms-1" />
          </button>
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <OnboardingImagePanel
        quote={{
          text: "My clients love how easy it is to book. Revenue went up 40% in just 3 months after switching.",
          author: "James K.",
          role: "Master Barber, New York",
        }}
      />
    </OnboardingPageWrapper>
  );
}
