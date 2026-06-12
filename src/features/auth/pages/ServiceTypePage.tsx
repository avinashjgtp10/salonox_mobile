import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ServiceTypePage.scss";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaCut,
  FaHandSparkles,
  FaEye,
  FaSpa,
  FaHotTub,
  FaHeartbeat,
  FaDumbbell,
  FaUserTie,
} from "react-icons/fa";
import { GiLipstick, GiRazor } from "react-icons/gi";
import { MdOutlineFaceRetouchingNatural } from "react-icons/md";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";

export default function ServiceTypePage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();

  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const categories = [
    { name: "Hair salon", icon: <FaCut /> },
    { name: "Nails", icon: <FaHandSparkles /> },
    { name: "Eyebrows & lashes", icon: <FaEye /> },
    { name: "Beauty salon", icon: <GiLipstick /> },
    { name: "Medspa", icon: <MdOutlineFaceRetouchingNatural /> },
    { name: "Barber", icon: <GiRazor /> },
    { name: "Massage", icon: <FaSpa /> },
    { name: "Spa & sauna", icon: <FaHotTub /> },
    { name: "Waxing salon", icon: <FaSpa /> },
    { name: "Tattooing & piercing", icon: <FaHeartbeat /> },
    { name: "Tanning studio", icon: <FaUserTie /> },
    { name: "Fitness & recovery", icon: <FaDumbbell /> },
    { name: "Physical therapy", icon: <FaHeartbeat /> },
    { name: "Health practice", icon: <FaHeartbeat /> },
    { name: "Pet grooming", icon: <FaSpa /> },
    { name: "Other", icon: <FaUserTie /> },
  ];

  const handleSelect = (name: string) => {
    setError("");
    if (selected.includes(name)) {
      setSelected(selected.filter((i) => i !== name));
      if (name === "Other") setShowOtherInput(false);
      return;
    }
    if (selected.length >= 3) {
      setError("You can select maximum 3 services.");
      return;
    }
    setSelected([...selected, name]);
    if (name === "Other") setShowOtherInput(true);
  };

  const isValid =
    selected.length > 0 &&
    !(selected.includes("Other") && otherValue.trim() === "");

  const handleContinue = () => {
    if (!isValid) return;
    const business_type = selected[0] === "Other" ? otherValue.trim() : selected[0];
    update({ business_type });
    navigate("/team-setup");
  };

  return (
    <OnboardingPageWrapper className="bg-light">
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 bg-white p-4 p-lg-5 position-relative">
          <OnboardingBackButton />

          <div className="mt-4">
            <h3 className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827", letterSpacing: "-0.02em" }}>
              Select your service categories
            </h3>
            <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
              Choose your primary and up to 3 related service types
            </p>

            {error && (
              <div className="alert py-2 px-3 mb-3" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "10px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <div className="row g-2">
              {categories.map((item) => {
                const isSelected = selected.includes(item.name);
                const index = selected.indexOf(item.name);
                return (
                  <div key={item.name} className="col-md-6">
                    <div
                      className={`card premium-choice-card p-3 ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelect(item.name)}
                    >
                      {isSelected && (
                        <span className="selection-badge">{index + 1}</span>
                      )}
                      {isSelected && index === 0 && (
                        <span className="primary-tag">Primary</span>
                      )}
                      <div className="d-flex align-items-center gap-3">
                        <div className="fs-5 text-secondary">{item.icon}</div>
                        <div className="fw-medium" style={{ fontSize: "14px", color: "#111827" }}>{item.name}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {showOtherInput && (
              <div className="mt-3">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                  Other service type
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bridal makeup"
                  value={otherValue}
                  onChange={(e) => setOtherValue(e.target.value)}
                  style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px" }}
                />
              </div>
            )}

            <button
              className="btn btn-dark w-100 rounded-pill mt-4"
              style={{ height: "52px", fontWeight: 600, fontSize: "14px" }}
              disabled={!isValid}
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          stats={[
            { value: "500+", label: "Service Types" },
            { value: "All-in-one", label: "Platform" },
          ]}
          quote={{
            text: "From bookings to payments — salonox handles everything seamlessly. I focus on my clients, not admin.",
            author: "Priya R.",
            role: "Beauty Salon Owner, Mumbai",
          }}
        />
    </OnboardingPageWrapper>
  );
}
