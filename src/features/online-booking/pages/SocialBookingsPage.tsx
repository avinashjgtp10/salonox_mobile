import { useState } from "react";
import {
  Facebook,
  Instagram,
  CheckCircleFill,
  ArrowUpRightSquare,
  People,
  HandThumbsUp,
  Repeat,
} from "react-bootstrap-icons";
import "../styles/OnlineBooking.scss";

const BENEFITS = [
  {
    icon: <People size={22} />,
    title: "Reach more clients",
    desc: "Millions of potential clients browse Facebook and Instagram every day.",
  },
  {
    icon: <HandThumbsUp size={22} />,
    title: "One-tap booking",
    desc: "Clients can book without leaving their favorite social app.",
  },
  {
    icon: <Repeat size={22} />,
    title: "Synced to your calendar",
    desc: "All social bookings flow into your existing salonox calendar instantly.",
  },
];

interface PlatformCardProps {
  name: string;
  icon: React.ReactNode;
  logoClass: string;
  description: string;
  pageExample: string;
  accentColor: string;
}

function PlatformCard({
  name,
  icon,
  logoClass,
  description,
  pageExample,
  accentColor,
}: PlatformCardProps) {
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
    <div className={`ob-integration-card ${connected ? "ob-integration-card--connected" : ""}`}>
      <div className="ob-integration-top">
        <div className={`ob-integration-logo ${logoClass}`}>{icon}</div>
        <span
          className={`ob-status ob-status--${connected ? "active" : "inactive"}`}
        >
          <span className="ob-status-dot" />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div>
        <p className="ob-integration-name">{name}</p>
        <p className="ob-integration-desc">{description}</p>
      </div>

      {connected && (
        <div
          style={{
            padding: "10px 14px",
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 12.5,
            color: "#374151",
            border: "1px solid #e5e7eb",
          }}
        >
          Connected as <strong>{pageExample}</strong>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {connected ? (
          <>
            <button className="ob-btn-outline" style={{ flex: 1, justifyContent: "center" }}>
              <ArrowUpRightSquare size={13} /> View page
            </button>
            <button
              className="ob-btn-danger"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => setConnected(false)}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="ob-btn-primary"
            style={{ width: "100%", justifyContent: "center", background: accentColor }}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : `Connect ${name}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SocialBookingsPage() {
  return (
    <div className="ob-page">
      {/* ── Header ── */}
      <div className="ob-page-header">
        <div>
          <h1 className="ob-page-title">Facebook & Instagram Bookings</h1>
          <p className="ob-page-sub">
            Add a "Book Now" button to your social media pages and let clients book without leaving
            the app.
          </p>
        </div>
      </div>

      {/* ── Platform Cards ── */}
      <div className="ob-integration-grid">
        <PlatformCard
          name="Facebook"
          icon={<Facebook size={24} color="#1877f2" />}
          logoClass="ob-integration-logo--facebook"
          description="Add a Book Now button to your Facebook Business Page and reach clients on the world's largest social network."
          pageExample="My Salon · Facebook"
          accentColor="#1877f2"
        />
        <PlatformCard
          name="Instagram"
          icon={<Instagram size={24} color="#e1306c" />}
          logoClass="ob-integration-logo--instagram"
          description="Enable the Book button on your Instagram Business profile and turn followers into paying clients."
          pageExample="@mysalon · Instagram"
          accentColor="#e1306c"
        />
      </div>

      {/* ── Requirements ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 16 }}>Before you connect</p>
        <div className="ob-steps">
          {[
            {
              title: "Facebook Business Page",
              desc: "You must have an active Facebook Business Page (not a personal profile) to enable bookings.",
            },
            {
              title: "Instagram Business account",
              desc: "Switch your Instagram profile to a Business or Creator account and connect it to your Facebook Page.",
            },
            {
              title: "Admin access",
              desc: "You must be an admin of the Facebook Page to complete the connection.",
            },
          ].map((item, i) => (
            <div key={i} className="ob-step">
              <div className="ob-step-num">
                <CheckCircleFill size={16} style={{ color: "#6b7280" }} />
              </div>
              <div className="ob-step-body">
                <p className="ob-step-title">{item.title}</p>
                <p className="ob-step-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Benefits ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 20 }}>Why connect social media?</p>
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

      {/* ── Post-booking Automation ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Post-booking automations</p>
            <p className="ob-card-sub">
              Automatically engage clients after they book through social media.
            </p>
          </div>
        </div>

        {[
          { label: "Send confirmation via WhatsApp", hint: "Uses your connected WhatsApp channel." },
          { label: "Send reminder 24 hours before", hint: "Reduces no-shows from social bookings." },
          { label: "Request a review after visit",  hint: "Boosts your social proof and ratings." },
        ].map((row) => (
          <div key={row.label} className="ob-toggle-row">
            <div className="ob-toggle-info">
              <p className="ob-toggle-label">{row.label}</p>
              <p className="ob-toggle-hint">{row.hint}</p>
            </div>
            <label className="ob-switch">
              <input type="checkbox" defaultChecked />
              <span className="ob-switch-track">
                <span className="ob-switch-thumb" />
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
