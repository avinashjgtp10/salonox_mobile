import { useState } from "react";
import {
  Google,
  CheckCircleFill,
  ArrowUpRightSquare,
  InfoCircle,
  Shield,
  GraphUpArrow,
  CalendarCheck,
} from "react-bootstrap-icons";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/OnlineBooking.scss";

const STEPS = [
  {
    title: "Connect your Google Business Profile",
    desc: "Sign in with your Google account and select the Business Profile that represents your salon.",
  },
  {
    title: "Verify your business details",
    desc: "Confirm your address, phone number, and category so Google can match your listing correctly.",
  },
  {
    title: "Enable Reserve with Google",
    desc: "Once verified, a 'Book' button will appear on Google Search and Maps within 24-48 hours.",
  },
];

const BENEFITS = [
  { icon: <CalendarCheck size={22} />, title: "More bookings", desc: "Clients book directly from Google — no extra steps or redirects." },
  { icon: <GraphUpArrow size={22} />, title: "Increased visibility", desc: "Your salon stands out in search with the Book button on your listing." },
  { icon: <Shield size={22} />, title: "Zero extra cost", desc: "Reserve with Google is free — you only pay your standard plan rate." },
];

export default function ReserveWithGooglePage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1800);
  };

  return (
    <div className="ob-page">
      {/* ── Header ── */}
      <div className="ob-page-header">
        <div>
          <h1 className="ob-page-title">Reserve with Google</h1>
          <p className="ob-page-sub">
            Let clients book appointments directly from Google Search and Maps.
          </p>
        </div>
        {connected && (
          <span className="ob-status ob-status--active">
            <span className="ob-status-dot" /> Connected
          </span>
        )}
      </div>

      {/* ── Connection Card ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ob-integration-logo ob-integration-logo--google">
              <Google size={24} color="#ea4335" />
            </div>
            <div>
              <p className="ob-card-title">Google Business Profile</p>
              <p className="ob-card-sub">
                {connected
                  ? "My Salon · Google listing connected"
                  : "Not connected — click below to set up."}
              </p>
            </div>
          </div>
          {connected ? (
            <button className="ob-btn-danger" onClick={() => setConnected(false)}>
              Disconnect
            </button>
          ) : (
            <button
              className="ob-btn-primary"
              onClick={handleConnect}
              disabled={connecting}
              style={{ minWidth: 140 }}
            >
              {connecting ? "Connecting…" : "Connect Google"}
            </button>
          )}
        </div>

        {connected && (
          <div className="ob-info-banner" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <CheckCircleFill size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
            <p className="ob-info-text" style={{ color: "#166534" }}>
              <strong>All set!</strong> A "Book" button is now live on your Google Search and Maps
              listing. New bookings coming from Google will appear in your Calendar automatically.
            </p>
          </div>
        )}
      </div>

      {/* ── Stats (only when connected) ── */}
      {connected && (
        <div className="ob-card">
          <p className="ob-card-title" style={{ marginBottom: 16 }}>Booking stats from Google</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Bookings this month", value: "0" },
              { label: "Click-to-book rate",  value: "—" },
              { label: "New clients via Google", value: "0" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "16px 20px",
                  background: "#f9fafb",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      {!connected && (
        <div className="ob-card">
          <p className="ob-card-title" style={{ marginBottom: 4 }}>How it works</p>
          <p className="ob-card-sub" style={{ marginBottom: 20 }}>
            Three steps to get your "Book" button live on Google.
          </p>
          <div className="ob-steps">
            {STEPS.map((step, i) => (
              <div key={i} className="ob-step">
                <div className="ob-step-num">{i + 1}</div>
                <div className="ob-step-body">
                  <p className="ob-step-title">{step.title}</p>
                  <p className="ob-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Benefits ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 20 }}>Why use Reserve with Google?</p>
        <div className="ob-how-grid">
          {BENEFITS.map((b) => (
            <div key={b.title} className="ob-how-item">
              <div className="ob-how-icon" style={{ color: "#111827" }}>{b.icon}</div>
              <p className="ob-how-title">{b.title}</p>
              <p className="ob-how-desc">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Learn more ── */}
      <div className="ob-card" style={{ background: "#f9fafb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <InfoCircle size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
            Reserve with Google requires an active Google Business Profile.{" "}
            <LearnMoreLink
              topic="reserve-with-google"
              className="ob-btn-outline"
              style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Learn more <ArrowUpRightSquare size={12} />
            </LearnMoreLink>
          </p>
        </div>
      </div>
    </div>
  );
}
