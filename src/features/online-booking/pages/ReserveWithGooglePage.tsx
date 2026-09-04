import {
  Google,
  ArrowUpRightSquare,
  InfoCircle,
  Shield,
  GraphUpArrow,
  CalendarCheck,
  Hourglass,
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
        <span className="ob-status ob-status--inactive">
          <Hourglass size={11} /> Coming soon
        </span>
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
                This integration isn't live yet — we'll let you know as soon as it's ready to connect.
              </p>
            </div>
          </div>
          <button className="ob-btn-outline" disabled style={{ minWidth: 140, opacity: 0.6, cursor: "not-allowed" }}>
            Coming soon
          </button>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 4 }}>How it will work</p>
        <p className="ob-card-sub" style={{ marginBottom: 20 }}>
          Three steps to get your "Book" button live on Google, once this integration launches.
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
