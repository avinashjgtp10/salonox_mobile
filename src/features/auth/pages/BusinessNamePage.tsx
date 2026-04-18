import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "../styles/BusinessNamePage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

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
    <div className="container-fluid p-0 h-100">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 bg-white d-flex align-items-center justify-content-center p-4 p-lg-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "24px", left: "24px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div className="w-100" style={{ maxWidth: "420px" }}>
            <h3 className="fw-bold mb-1" style={{ fontSize: "26px", color: "#111827", letterSpacing: "-0.02em" }}>
              What's your business name?
            </h3>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              This is the brand name your clients will see. Your billing and legal name can be added later.
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Business name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${submitted && !isValid ? "is-invalid" : ""}`}
                placeholder="e.g. Glamour Salon"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px" }}
              />
              {submitted && !isValid && (
                <div className="invalid-feedback">Business name must be at least 3 characters</div>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Website <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="www.yoursite.com"
                className="form-control"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px" }}
              />
            </div>

            <button
              className="btn btn-dark w-100 rounded-pill"
              style={{ height: "52px", fontWeight: 600, fontSize: "14px" }}
              onClick={handleContinue}
            >
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
      </div>
    </div>
  );
}
