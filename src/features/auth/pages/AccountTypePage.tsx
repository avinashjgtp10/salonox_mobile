import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AccountTypePage.scss";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

export default function AccountTypePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"new" | "join" | null>(null);

  useAutoNavigate(!!selected, () => {
    if (selected === "new") navigate("/business-name");
    if (selected === "join") navigate("/join-business");
  }, 500);

  return (
    <OnboardingPageWrapper>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 d-flex align-items-center justify-content-center position-relative bg-white px-4 px-lg-5">
          <div className="w-100 account-wrapper">
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

            <AutoNavigateIndicator visible={!!selected} className="justify-content-center" />
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
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
    </OnboardingPageWrapper>
  );
}
