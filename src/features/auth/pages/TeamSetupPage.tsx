import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiUser, FiUsers } from "react-icons/fi";
import "../styles/TeamSetupPage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";
import OnboardingChoiceCard from "../components/OnboardingChoiceCard";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

export default function TeamSetupPage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<"independent" | "team" | null>(null);

  useAutoNavigate(!!selected, () => {
    update({ team_type: selected! });
    if (selected === "independent") navigate("/business-location");
    else navigate("/team-size");
  }, 500);

  return (
    <OnboardingPageWrapper className="bg-page">
      {/* LEFT PANEL */}
      <div className="col-lg-5 col-12 left-panel d-flex flex-column px-4 px-lg-5 position-relative bg-white">
        <OnboardingBackButton />

        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: "420px" }}>
            <h3 className="account-heading mb-2" style={{ fontSize: "26px" }}>Select your account type</h3>
            <p className="account-subheading mb-4">
              This helps us personalise the tools and features for you.
            </p>

            <div className="d-flex flex-column gap-3">
              <OnboardingChoiceCard
                selected={selected === "independent"}
                onClick={() => setSelected("independent")}
                className="d-flex flex-row align-items-center gap-3"
              >
                <div className="choice-icon-bg flex-shrink-0"><FiUser size={20} /></div>
                <div>
                  <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>I'm an independent</div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>Solo professional or freelancer</div>
                </div>
              </OnboardingChoiceCard>

              <OnboardingChoiceCard
                selected={selected === "team"}
                onClick={() => setSelected("team")}
                className="d-flex flex-row align-items-center gap-3"
              >
                <div className="choice-icon-bg flex-shrink-0"><FiUsers size={20} /></div>
                <div>
                  <div className="fw-bold" style={{ fontSize: "15px", color: "#111827" }}>I have staff</div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>Manage staff, schedules & payroll</div>
                </div>
              </OnboardingChoiceCard>
            </div>

            <AutoNavigateIndicator visible={!!selected} className="justify-content-center" />
          </div>
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <OnboardingImagePanel
        quote={{
          text: "Managing my staff of 8 stylists has never been this smooth. The scheduling tools are a game-changer.",
          author: "Rachel T.",
          role: "Spa Manager, Dubai",
        }}
      />
    </OnboardingPageWrapper>
  );
}
