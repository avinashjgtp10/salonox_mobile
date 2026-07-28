import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/SendRequestPage.scss";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

export default function SendRequestPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const business = state?.business;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (message.length > 100) {
      setError("Message cannot exceed 100 characters.");
      return;
    }

    setError("");
    navigate("/request-success");
  };

  return (
    <div className="container-fluid p-0 send-page">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* LEFT */}
        <div className="col-lg-5 col-12 bg-white d-flex flex-column px-4 px-lg-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "24px", left: "24px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="w-100" style={{ maxWidth: "420px" }}>
              <h2 className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827" }}>
                Send a request to join
              </h2>
              <p className="fw-semibold mb-4" style={{ fontSize: "18px", color: "#111827" }}>
                {business?.business_name ?? "this business"}
              </p>

              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Add a message <span className="text-muted fw-normal">(Optional)</span>
              </label>

              <div className="d-flex justify-content-end small mb-1">
                <span className="text-muted">{message.length}/100</span>
              </div>

              <textarea
                className={`form-control ${error ? "is-invalid" : ""}`}
                rows={4}
                placeholder="Introduce yourself..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (e.target.value.length <= 100) setError("");
                }}
                style={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px", resize: "none" }}
              />
              {error && <div className="invalid-feedback d-block">{error}</div>}

              <button
                className="btn btn-dark w-100 rounded-pill mt-4"
                style={{ height: "52px", fontWeight: 600, fontSize: "14px" }}
                onClick={handleSubmit}
              >
                Send request
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          quote={{
            text: "Joining the staff was effortless. Everything I needed was ready on day one.",
            author: "Carlos M.",
            role: "Barber, Madrid",
          }}
        />
      </div>
    </div>
  );
}
