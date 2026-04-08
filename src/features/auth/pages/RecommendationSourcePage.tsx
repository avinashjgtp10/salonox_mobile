import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/RecommendationSourcePage.scss";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useOnboarding } from "../../../context/OnboardingContext";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { saveSalonThunk } from "../../../middleware/salon/salon.thunk";
import { login, updateOnboardingStatus } from "../../../store/authSlice";
import type { CreateSalonPayload } from "../../../types/salon.types";
import salonImg from "../../../assets/images/salon.jpg";

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
      const { accessToken, refreshToken, isOnboardingComplete } =
        result.payload;

      if (accessToken && refreshToken) {
        dispatch(login({ accessToken, refreshToken, isOnboardingComplete }));
      } else {
        dispatch(updateOnboardingStatus(true));
      }

      reset();
      navigate("/setup-complete");
    } else {
      console.error("Salon save failed:", result.payload);
    }
  };

  return (
    <div className="recommend-container container-fluid p-0 position-relative">
      <div className="progress rounded-0" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "100%" }} />
      </div>

      {/* Top Right Buttons overlay (hidden from pointer interactions) */}
      <div
        className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3"
        style={{ pointerEvents: "none" }}
      >
        <button
          className="btn btn-outline-secondary rounded-pill bg-white px-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="btn btn-dark rounded-pill px-4 d-lg-none"
          style={{ pointerEvents: "auto" }}
          disabled={
            loading ||
            !selected ||
            (selected === "Other" && otherText.trim() === "")
          }
          onClick={handleDone}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Saving...
            </>
          ) : (
            <>
              Continue <FiArrowRight size={16} className="ms-1" />
            </>
          )}
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-12 bg-white p-5">
          <button
            className="btn btn-light border rounded-circle mb-4"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div style={{ maxWidth: "420px" }}>
            <p className="text-muted small">Account setup</p>
            <h4 className="fw-bold mb-4">How did you hear about us?</h4>

            {error && <div className="alert alert-danger">{error}</div>}

            {options.map((item, index) => (
              <button
                key={index}
                className={`recommend-pill rounded-pill mb-3 ${selected === item ? "active" : ""}`}
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
                  <label className="form-label">Please specify</label>
                  <small>{otherText.length}/255</small>
                </div>
                <input
                  type="text"
                  maxLength={255}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className={`form-control ${
                    submitted && otherText.trim() === "" ? "is-invalid" : ""
                  }`}
                />
                {submitted && otherText.trim() === "" && (
                  <div className="invalid-feedback d-block">
                    This field is required
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="col-lg-7 d-none d-lg-block position-relative p-0"
          style={{ minHeight: "100vh" }}
        >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Desktop Continue Button on Image */}
          <div className="position-absolute top-0 end-0 p-4 z-3">
            <button
              className="btn btn-dark rounded-pill px-4"
              disabled={
                loading ||
                !selected ||
                (selected === "Other" && otherText.trim() === "")
              }
              onClick={handleDone}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving...
                </>
              ) : (
                <>
                  Continue <FiArrowRight size={16} className="ms-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
