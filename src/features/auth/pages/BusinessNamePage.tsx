import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/BusinessNamePage.scss";
import "../styles/onboarding-shared.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMeThunk } from "../../../middleware/user/user.thunk";

export default function BusinessNamePage() {
  const navigate = useNavigate();
  const { data, update } = useOnboarding();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.user.profile);

  const [businessName, setBusinessName] = useState(data.business_name);
  const [website, setWebsite] = useState(data.website_url);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ businessName: false, website: false });

  // Prefill from the registration data (already saved server-side as businessName)
  // so the user isn't asked to re-enter what they just typed at signup.
  useEffect(() => {
    if (!data.business_name && !profile) {
      dispatch(fetchMeThunk());
    }
  }, []);

  useEffect(() => {
    if (!data.business_name && profile?.businessName && !businessName) {
      setBusinessName(profile.businessName);
    }
  }, [profile]);

  const isBusinessNameValid = businessName.trim().length >= 3;
  const websiteRx = /^([\w-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;
  const isWebsiteValid = website.trim() === "" || websiteRx.test(website.trim());

  const showBusinessNameError = (touched.businessName || submitted) && !isBusinessNameValid;
  const showWebsiteError = (touched.website || submitted) && !isWebsiteValid;

  const isValid = isBusinessNameValid && isWebsiteValid;

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
              className={`ob-input ${showBusinessNameError ? "is-invalid" : ""}`}
              placeholder="e.g. Glamour Salon"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, businessName: true }))}
            />
            {showBusinessNameError && (
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
              className={`ob-input ${showWebsiteError ? "is-invalid" : ""}`}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, website: true }))}
            />
            {showWebsiteError && (
              <div className="invalid-feedback d-block ob-invalid-msg">
                Enter a valid website address
              </div>
            )}
          </div>

          <button className="ob-btn-primary w-100" onClick={handleContinue}>
            Continue
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
