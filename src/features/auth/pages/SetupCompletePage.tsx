import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateOnboardingStatus } from "../../../store/authSlice";
import "../styles/SetupCompletePage.scss";
import salonImg from "../../../assets/images/salon.jpg";

export default function SetupCompletePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleDone = () => {
    dispatch(updateOnboardingStatus(true));
    navigate("/dashboard");
  };

  return (
    <div className="container-fluid p-0">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* LEFT PANEL — celebration */}
        <div className="col-lg-5 col-12 d-flex align-items-center justify-content-center bg-white p-4 p-lg-5">
          <div className="text-center setup-complete-content">
            {/* Animated check circle */}
            <div className="complete-icon mb-4 d-flex justify-content-center align-items-center mx-auto">
              <span>✓</span>
            </div>

            {/* Confetti dots */}
            <div className="confetti-row mb-4" aria-hidden="true">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
              <span className="dot dot-3" />
              <span className="dot dot-4" />
              <span className="dot dot-5" />
            </div>

            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827", letterSpacing: "-0.02em" }}>
              Your business is set up!
            </h2>
            <p className="text-muted mb-2" style={{ fontSize: "15px" }}>
              Enjoy <strong>7 days free</strong> of using salonox for business.
            </p>
            <p className="text-muted mb-5" style={{ fontSize: "13px" }}>
              No credit card required to get started.
            </p>

            {/* Highlights */}
            <div className="setup-highlights mb-5">
              {[
                { icon: "📅", text: "Bookings are ready to go" },
                { icon: "💳", text: "Payments set up instantly" },
                { icon: "👥", text: "Staff management enabled" },
              ].map((item, i) => (
                <div key={i} className="highlight-row">
                  <span className="highlight-icon">{item.icon}</span>
                  <span className="highlight-text">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              className="btn btn-dark rounded-pill px-5 complete-btn"
              onClick={handleDone}
            >
              Go to dashboard →
            </button>

            <p className="text-muted mt-3" style={{ fontSize: "12px" }}>
              You can always adjust your settings later.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL — salon image with overlay */}
        <div
          className="col-lg-7 d-none d-lg-flex p-0 position-relative overflow-hidden flex-column complete-right-panel"
          style={{ minHeight: "100vh" }}
        >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Gradient overlay */}
          <div className="complete-overlay" />

          {/* Brand top-left */}
          <div className="complete-brand">salonox</div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bottom message */}
          <div className="complete-bottom">
            <div className="complete-milestone-card">
              <div className="milestone-number">10,000+</div>
              <div className="milestone-label">professionals already growing with salonox</div>
              <div className="milestone-sub mt-3">
                "I doubled my bookings in the first month. The setup was seamless."
              </div>
              <div className="milestone-author mt-2">— Nina P., Lash Technician, Toronto</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
