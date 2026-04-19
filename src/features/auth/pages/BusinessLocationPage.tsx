import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import "../styles/BusinessLocationPage.scss";
import "../styles/onboarding-shared.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

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

  useAutoNavigate(!!selected, () => {
    update({ location_type: selected! });
    if (selected === "physical") navigate("/venue-location");
    else navigate("/previous-software");
  }, 500);

  return (
    <OnboardingPageWrapper>
      {/* LEFT PANEL */}
      <div className="col-lg-5 col-12 left-panel d-flex flex-column px-4 px-lg-5 position-relative bg-white">
        <OnboardingBackButton />

        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="account-wrapper">
            <h3 className="account-heading mb-2">Where do you provide your services?</h3>
            <p className="ob-subtext mb-4">
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
                    <div className="ob-card-label">{item.label}</div>
                    <div className="ob-card-sub-label">{item.sub}</div>
                  </div>
                  {selected === item.id && (
                    <div className="check-icon-wrapper">
                      <FiCheck size={18} />
                    </div>
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
          text: "Walk-ins, online bookings, and virtual consultations — all perfectly organised in one place.",
          author: "Ayesha K.",
          role: "Nail Technician & Educator",
        }}
      />
    </OnboardingPageWrapper>
  );
}
