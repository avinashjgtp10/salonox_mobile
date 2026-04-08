import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "../styles/BusinessNamePage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import salonImg from "../../../assets/images/salon.jpg";

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
    <div className="container-fluid p-0">
      <div className="progress rounded-0" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "30%" }} />
      </div>

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
          onClick={handleContinue}
        >
          Continue <FiArrowRight size={16} className="ms-1" />
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-12 bg-light d-flex align-items-center justify-content-center p-4 position-relative">
          <button
            className="btn btn-outline-secondary rounded-circle position-absolute"
            style={{ top: "30px", left: "30px", width: "44px", height: "44px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div
            className="card shadow-sm p-4 w-100"
            style={{ maxWidth: "480px" }}
          >
            <p className="text-muted small mb-2">Account setup</p>
            <h4 className="fw-bold mb-2">What's your business name?</h4>
            <p className="text-muted small mb-4">
              This is the brand name your clients will see. Your billing and
              legal name can be added later.
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold">Business name *</label>
              <input
                type="text"
                className={`form-control ${submitted && !isValid ? "is-invalid" : ""}`}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              {submitted && !isValid && (
                <div className="invalid-feedback">
                  Business name must be at least 3 characters
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">
                Website (Optional)
              </label>
              <input
                type="text"
                placeholder="www.yoursite.com"
                className="form-control"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <button
              className="btn btn-dark w-100 rounded-pill"
              onClick={handleContinue}
            >
              Continue →
            </button>
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
              onClick={handleContinue}
            >
              Continue <FiArrowRight size={16} className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
