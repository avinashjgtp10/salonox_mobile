import React from "react";
import { useNavigate } from "react-router-dom";
import { Check2, Scissors, StarFill, Gem } from "react-bootstrap-icons";
import "../styles/Membershipslandingpage.scss";

const MembershipsLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="memberships-landing-page">
      <div className="container-fluid py-4 px-4">

        {/* Page Header */}
        <div className="row align-items-center mb-4">
          <div className="col">
            <h4 className="memberships-landing-page__title fw-bold mb-0">Memberships</h4>
            <p className="text-muted small mb-0">Manage membership plans for your clients</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="memberships-landing-page__hero row align-items-center">

          {/* Left: Copy */}
          <div className="col-12 col-lg-6 memberships-landing-page__hero-copy">
            <span className="memberships-landing-page__badge mb-3 d-inline-block">Free to use</span>
            <h2 className="memberships-landing-page__headline fw-bold mb-3">
              Manage multi-session<br />memberships
            </h2>
            <p className="memberships-landing-page__subtext mb-4">
              Boost your revenue by combining multiple treatments into a
              membership and turn your clients into regulars.
            </p>

            <ul className="memberships-landing-page__checklist list-unstyled mb-4">
              {[
                "Ensure a steady income with recurring memberships",
                "Encourage clients to buy an upfront course of treatments",
                "Clients can easily book and keep track of their remaining sessions",
              ].map((item) => (
                <li key={item} className="d-flex align-items-start gap-2 mb-2">
                  <Check2 className="memberships-landing-page__check-icon mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button
                className="btn memberships-landing-page__cta-btn"
                onClick={() => navigate("/dashboard/catalog/memberships/create")}
              >
                Start now
              </button>
              <button className="btn memberships-landing-page__learn-btn">
                Learn more
              </button>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="col-12 col-lg-6 d-flex justify-content-center justify-content-lg-end mt-5 mt-lg-0">
            <div className="memberships-landing-page__illustration-wrap">

              {/* Salon card */}
              <div className="memberships-landing-page__salon-card shadow">
                <div className="memberships-landing-page__salon-img-wrap">
                  <div className="memberships-landing-page__salon-img-placeholder">
                    <Scissors size={48} className="text-white opacity-50" />
                  </div>
                </div>
                <div className="p-3">
                  <div className="fw-semibold small">Trendy Studio</div>
                  <div className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: "0.7rem" }}>
                    <span className="text-warning">★</span>
                    <span className="fw-medium">5.0</span>
                    <span className="text-muted">700 reviews</span>
                  </div>
                  {[
                    { name: "Short hair cut", note: "included in membership", highlight: true },
                    { name: "Medium hair cut", note: "1 hour" },
                    { name: "Long hair cut", note: "1 hour" },
                  ].map((svc) => (
                    <div key={svc.name} className="memberships-landing-page__service-row">
                      <div className="small fw-medium">{svc.name}</div>
                      <div className={`memberships-landing-page__service-note ${svc.highlight ? "memberships-landing-page__service-note--green" : "text-muted"}`}
                        style={{ fontSize: "0.68rem" }}>
                        {svc.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating membership plans card */}
              <div className="memberships-landing-page__plans-card shadow-lg">
                <div className="fw-semibold small mb-3">Memberships</div>
                {[
                  { icon: Scissors, color: "#4CAF50", name: "Short hair services", sub: "Monthly plan" },
                  { icon: StarFill, color: "#2196F3", name: "Deluxe hair plan", sub: "8 sessions" },
                  { icon: Gem, color: "#9C27B0", name: "Premium", sub: "4 sessions" },
                ].map((plan) => (
                  <div key={plan.name} className="memberships-landing-page__plan-row d-flex align-items-center gap-2 mb-2">
                    <div className="memberships-landing-page__plan-icon-wrap" style={{ background: plan.color + "1a" }}>
                      <plan.icon style={{ color: plan.color, fontSize: "0.85rem" }} />
                    </div>
                    <div>
                      <div className="small fw-medium lh-1">{plan.name}</div>
                      <div className="text-muted lh-1" style={{ fontSize: "0.68rem" }}>{plan.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MembershipsLandingPage;