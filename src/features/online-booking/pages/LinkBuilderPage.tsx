import { useState } from "react";
import {
  Link45deg,
  Clipboard,
  ClipboardCheck,
  QrCode,
  Share,
  Globe,
  PersonCircle,
  Tag,
} from "react-bootstrap-icons";
import "../styles/OnlineBooking.scss";

const PRESETS = [
  {
    id: "all",
    icon: <Globe size={20} />,
    label: "Any service",
    desc: "Clients pick their own service & staff",
  },
  {
    id: "service",
    icon: <Tag size={20} />,
    label: "Specific service",
    desc: "Pre-select a single service for the client",
  },
  {
    id: "staff",
    icon: <PersonCircle size={20} />,
    label: "Specific staff",
    desc: "Pre-select a staff member to book with",
  },
];

const MOCK_SERVICES = ["Haircut", "Color & Highlights", "Blowdry", "Beard Trim", "Facial"];
const MOCK_STAFF    = ["Alice Johnson", "Ben Carter", "Chloe Kim", "David Lee"];

export default function LinkBuilderPage() {
  const [preset, setPreset]       = useState("all");
  const [service, setService]     = useState(MOCK_SERVICES[0]);
  const [staff, setStaff]         = useState(MOCK_STAFF[0]);
  const [copied, setCopied]       = useState(false);
  const [showQR, setShowQR]       = useState(false);

  const buildLink = () => {
    const base = "https://book.salonox.com/my-salon";
    if (preset === "service") return `${base}?service=${encodeURIComponent(service)}`;
    if (preset === "staff")   return `${base}?staff=${encodeURIComponent(staff)}`;
    return base;
  };

  const link = buildLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ob-page">
      {/* ── Header ── */}
      <div className="ob-page-header">
        <div>
          <h1 className="ob-page-title">Link Builder</h1>
          <p className="ob-page-sub">
            Generate custom booking links to share on social media, emails, or your website.
          </p>
        </div>
      </div>

      {/* ── Preset Selector ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 4 }}>Choose link type</p>
        <p className="ob-card-sub" style={{ marginBottom: 20 }}>
          Select what the link should pre-fill for your client.
        </p>
        <div className="ob-link-presets">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              className={`ob-preset-card ${preset === p.id ? "ob-preset-card--active" : ""}`}
              onClick={() => setPreset(p.id)}
            >
              <div className="ob-preset-icon">{p.icon}</div>
              <p className="ob-preset-label">{p.label}</p>
              <p className="ob-preset-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters (conditional) ── */}
      {preset !== "all" && (
        <div className="ob-card">
          <p className="ob-card-title" style={{ marginBottom: 16 }}>
            {preset === "service" ? "Select service" : "Select staff member"}
          </p>
          {preset === "service" && (
            <div className="ob-form-group">
              <label className="ob-label">Service</label>
              <select
                className="ob-select"
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {MOCK_SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          {preset === "staff" && (
            <div className="ob-form-group">
              <label className="ob-label">Staff member</label>
              <select
                className="ob-select"
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
              >
                {MOCK_STAFF.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Generated Link ── */}
      <div className="ob-card">
        <p className="ob-card-title" style={{ marginBottom: 4 }}>Your booking link</p>
        <p className="ob-card-sub" style={{ marginBottom: 16 }}>
          Copy and share this link anywhere to start receiving bookings.
        </p>
        <div className="ob-link-display">
          <Link45deg size={15} style={{ color: "#6b7280", flexShrink: 0 }} />
          <span className="ob-link-url">{link}</span>
          <button
            className={`ob-copy-btn ${copied ? "ob-copy-btn--copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? <><ClipboardCheck size={13} /> Copied!</> : <><Clipboard size={13} /> Copy</>}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="ob-btn-outline">
            <Share size={14} /> Share via WhatsApp
          </button>
          <button className="ob-btn-outline" onClick={() => setShowQR(!showQR)}>
            <QrCode size={14} /> {showQR ? "Hide QR code" : "Generate QR code"}
          </button>
        </div>

        {showQR && (
          <div className="ob-qr-area" style={{ marginTop: 20 }}>
            <div className="ob-qr-placeholder">
              <QrCode size={48} color="#111827" />
            </div>
            <p className="ob-qr-label">
              Scan to open the booking page.
              <br />
              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
                Print or embed on flyers, menus, or your website.
              </span>
            </p>
            <button className="ob-btn-outline" style={{ fontSize: 12.5 }}>
              Download PNG
            </button>
          </div>
        )}
      </div>

      {/* ── Saved Links ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Saved links</p>
            <p className="ob-card-sub">Previously generated links you've saved for quick access.</p>
          </div>
        </div>

        <div className="ob-empty">
          <div className="ob-empty-icon">
            <Link45deg size={36} color="#d1d5db" />
          </div>
          <p className="ob-empty-title">No saved links yet</p>
          <p className="ob-empty-desc">
            Build and save custom booking links above to see them here.
          </p>
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="ob-card" style={{ background: "#f9fafb" }}>
        <p className="ob-card-title" style={{ marginBottom: 14 }}>Tips for sharing your link</p>
        <ul style={{ padding: "0 0 0 18px", margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Add your booking link to your Instagram bio for one-tap bookings from followers.",
            "Include a QR code on printed price lists, loyalty cards, or mirrors in your salon.",
            "Paste the link into your Google Business Profile website field for extra visibility.",
            "Use staff-specific links in each stylist's personal social profile.",
          ].map((tip, i) => (
            <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
