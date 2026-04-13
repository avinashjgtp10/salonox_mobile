import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/RecommendationSourcePage.scss";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useOnboarding } from "../../../context/OnboardingContext";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { saveSalonThunk } from "../../../middleware/salon/salon.thunk";
import type { CreateSalonPayload } from "../../../types/salon.types";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

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
  const [submitted, setSubmitted] = useState(false);

  const handleDone = async () => {
    setSubmitted(true);
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

  const isDisabled = loading || !selected || (selected === "Other" && otherText.trim() === "");

  return (
    <div className="recommend-container container-fluid p-0 position-relative">
      {/* Progress bar */}
      <div className="progress rounded-0" style={{ height: "4px", background: "#f3f4f6" }}>
        <div className="progress-bar" style={{ width: "100%", background: "#111827" }} />
      </div>

      <div className="row g-0" style={{ minHeight: "calc(100vh - 4px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 bg-white p-4 p-lg-5">
          <button
            className="btn btn-light border rounded-circle mb-4 d-flex align-items-center justify-content-center"
            style={{ width: "40px", height: "40px", padding: 0 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div style={{ maxWidth: "420px" }}>
            <p className="onboarding-step-label mb-1">Account setup &nbsp;·&nbsp; Step 8 of 8</p>
            <h3 className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827", letterSpacing: "-0.02em" }}>
              How did you hear about us?
            </h3>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              This helps us understand where our community comes from.
            </p>

            {error && (
              <div className="alert py-2 px-3 mb-3" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "10px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            {options.map((item, index) => (
              <button
                key={index}
                className={`recommend-pill rounded-pill mb-2 ${selected === item ? "active" : ""}`}
                onClick={() => {
                  setSelected(item);
                  setSubmitted(false);
                }}
              >
                {item}
              </button>
            ))}

            {selected === "Other" && (
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Please specify</label>
                  <small className="text-muted">{otherText.length}/255</small>
                </div>
                <input
                  type="text"
                  maxLength={255}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className={`form-control ${submitted && otherText.trim() === "" ? "is-invalid" : ""}`}
                  style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb" }}
                />
                {submitted && otherText.trim() === "" && (
                  <div className="invalid-feedback d-block">This field is required</div>
                )}
              </div>
            )}

            {/* Mobile complete button */}
            <button
              className="btn btn-dark w-100 rounded-pill mt-4 d-lg-none"
              style={{ height: "52px", fontWeight: 600 }}
              disabled={isDisabled}
              onClick={handleDone}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving...
                </>
              ) : (
                <>Complete Setup <FiArrowRight size={16} className="ms-1" /></>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          continueBtn={
            <button
              className="btn btn-light rounded-pill px-4 fw-semibold"
              disabled={isDisabled}
              onClick={handleDone}
              style={{ fontSize: "14px" }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" style={{ width: "14px", height: "14px" }} />
                  Saving...
                </>
              ) : (
                <>Complete Setup <FiArrowRight size={14} className="ms-1" /></>
              )}
            </button>
          }
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
      </div>
    </div>
  );
}
