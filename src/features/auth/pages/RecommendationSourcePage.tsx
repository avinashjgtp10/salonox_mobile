import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/RecommendationSourcePage.scss";
import "../styles/onboarding-shared.scss";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useOnboarding } from "../../../context/OnboardingContext";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { saveSalonThunk } from "../../../middleware/salon/salon.thunk";
import { clearSalon } from "../../../store/salonSlice";
import type { CreateSalonPayload } from "../../../types/salon.types";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { useAutoNavigate } from "../../../hooks/useAutoNavigate";

const options = [
  "Recommended by a friend",
  "Search engine (e.g. Google, Bing)",
  "Social media",
  "Advert in the mail",
  "Magazine ad",
  "Ratings website (e.g. Capterra, Trustpilot)",
  "AI Chatbot (e.g. ChatGPT, Gemini)",
  "Other",
];

export default function RecommendationSourcePage() {
  const navigate = useNavigate();
  const { data, reset } = useOnboarding();
  const dispatch = useAppDispatch();
  const { loading: salonLoading, error } = useAppSelector((s) => s.salon);
  const loading = salonLoading.save;

  const [selected, setSelected] = useState("");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    dispatch(clearSalon());
  }, [dispatch]);

  const handleDone = async () => {
    if (!selected) return;
    if (selected === "Other" && otherText.trim() === "") return;

    const payload: CreateSalonPayload = {
      business_name: data.business_name,
      website_url: data.website_url || undefined,
      business_type: data.business_type || undefined,
      address: data.address || undefined,
      location_type: data.location_type || undefined,
      team_type: data.team_type || undefined,
      team_size: data.team_size || undefined,
      onboarding_completed: true,
    };

    const result = await dispatch(saveSalonThunk(payload));

    if (saveSalonThunk.fulfilled.match(result)) {
      const { accessToken, refreshToken } = result.payload;
      reset();
      navigate("/request-success", {
        state: { accessToken, refreshToken },
      });
    } else {
      console.error("Salon save failed:", result.payload);
    }
  };

  const isReadyToSubmit = !!selected && !(selected === "Other" && otherText.trim() === "");

  useAutoNavigate(isReadyToSubmit && !loading, handleDone, 600);

  return (
    <OnboardingPageWrapper className="recommend-container position-relative">
      {/* LEFT PANEL */}
      <div className="col-lg-5 col-12 bg-white p-4 p-lg-5">
        <button
          className="ob-back-btn mb-4"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft size={16} />
        </button>

        <div className="ob-content-max">
          <h3 className="ob-heading mb-1">How did you hear about us?</h3>
          <p className="ob-subtext mb-4">
            This helps us understand where our community comes from.
          </p>

          {error && (
            <div className="ob-api-error">{error}</div>
          )}

          {options.map((item, index) => (
            <button
              key={index}
              className={`recommend-pill rounded-pill mb-2 ${selected === item ? "active" : ""}`}
              onClick={() => setSelected(item)}
              disabled={loading}
            >
              {item}
            </button>
          ))}

          {selected === "Other" && (
            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <label className="ob-label">Please specify</label>
                <small className="text-muted">{otherText.length}/255</small>
              </div>
              <input
                type="text"
                maxLength={255}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className="ob-input"
              />
            </div>
          )}

          <AutoNavigateIndicator
            visible={isReadyToSubmit || loading}
            message={loading ? "Saving your setup..." : "Continuing..."}
          />
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <OnboardingImagePanel
        stats={[
          { value: "10K+", label: "Active users" },
          { value: "Weekly", label: "New joiners" },
        ]}
        quote={{
          text: "We're thrilled to have you. Hundreds of professionals join salonox every week — welcome to the community.",
          author: "The salonox Team",
          role: "Built for professionals, by professionals",
        }}
      />
    </OnboardingPageWrapper>
  );
}
