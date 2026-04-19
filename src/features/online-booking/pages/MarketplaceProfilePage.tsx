import { useState } from "react";
import {
  Globe,
  Upload,
  Clock,
  Eye,
  CheckCircle,
  InfoCircle,
  ImageFill,
} from "react-bootstrap-icons";
import "../styles/OnlineBooking.scss";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

const defaultHours: Record<string, DayHours> = {
  Monday:    { open: true,  from: "09:00", to: "18:00" },
  Tuesday:   { open: true,  from: "09:00", to: "18:00" },
  Wednesday: { open: true,  from: "09:00", to: "18:00" },
  Thursday:  { open: true,  from: "09:00", to: "18:00" },
  Friday:    { open: true,  from: "09:00", to: "18:00" },
  Saturday:  { open: true,  from: "10:00", to: "17:00" },
  Sunday:    { open: false, from: "10:00", to: "16:00" },
};

export default function MarketplaceProfilePage() {
  const [enabled, setEnabled] = useState(true);
  const [businessName, setBusinessName] = useState("My Salon");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState(defaultHours);
  const [saved, setSaved] = useState(false);

  const updateHour = (day: string, key: keyof DayHours, value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="ob-page">
      {/* ── Header ── */}
      <div className="ob-page-header">
        <div>
          <h1 className="ob-page-title">Marketplace Profile</h1>
          <p className="ob-page-sub">
            Manage how your salon appears on the online booking marketplace and across integrations.
          </p>
        </div>
        <div className="ob-header-actions">
          <button className="ob-btn-outline">
            <Eye size={15} /> Preview
          </button>
          <button
            className="ob-btn-primary"
            onClick={handleSave}
            style={saved ? { background: "#16a34a" } : {}}
          >
            {saved ? <><CheckCircle size={15} /> Saved</> : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Online Booking Toggle ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Online Booking Status</p>
            <p className="ob-card-sub">
              Allow clients to discover and book your services online.
            </p>
          </div>
          <span className={`ob-status ob-status--${enabled ? "active" : "inactive"}`}>
            <span className="ob-status-dot" />
            {enabled ? "Accepting bookings" : "Paused"}
          </span>
        </div>

        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Enable online booking</p>
            <p className="ob-toggle-hint">
              Clients can find and book you on the marketplace and via your booking link.
            </p>
          </div>
          <label className="ob-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="ob-switch-track">
              <span className="ob-switch-thumb" />
            </span>
          </label>
        </div>

        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Show on marketplace</p>
            <p className="ob-toggle-hint">
              Your salon will appear in salonox marketplace search results.
            </p>
          </div>
          <label className="ob-switch">
            <input type="checkbox" defaultChecked />
            <span className="ob-switch-track">
              <span className="ob-switch-thumb" />
            </span>
          </label>
        </div>

        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Instant confirmation</p>
            <p className="ob-toggle-hint">
              Bookings are confirmed immediately without manual approval.
            </p>
          </div>
          <label className="ob-switch">
            <input type="checkbox" defaultChecked />
            <span className="ob-switch-track">
              <span className="ob-switch-thumb" />
            </span>
          </label>
        </div>
      </div>

      {/* ── Profile Info ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Business Information</p>
            <p className="ob-card-sub">
              This is displayed to clients on your public booking page.
            </p>
          </div>
        </div>

        {/* Photo / Logo upload */}
        <div className="ob-section-label">Photos & Logo</div>
        <div className="ob-photo-grid" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div className="ob-photo-slot ob-photo-slot--logo">
              <ImageFill size={28} />
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Logo</span>
          </div>
          <div className="ob-photo-slot" style={{ minHeight: 120 }}>
            <span className="ob-photo-upload-icon"><Upload size={22} /></span>
            <span>Upload cover photo</span>
            <span style={{ fontSize: 11.5, color: "#9ca3af" }}>PNG, JPG up to 5MB</span>
          </div>
        </div>

        <div className="ob-section-label">Details</div>
        <div className="ob-form-group">
          <label className="ob-label">Business name</label>
          <input
            className="ob-input"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your salon name"
          />
        </div>

        <div className="ob-form-group">
          <label className="ob-label">
            Tagline <span className="ob-label-optional">(optional)</span>
          </label>
          <input
            className="ob-input"
            value={tagline}
            maxLength={80}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Premium cuts & color in the heart of the city"
          />
          <p className="ob-char-count">{tagline.length}/80</p>
        </div>

        <div className="ob-form-group">
          <label className="ob-label">
            Description <span className="ob-label-optional">(optional)</span>
          </label>
          <textarea
            className="ob-textarea"
            value={description}
            maxLength={500}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell clients what makes your salon special…"
          />
          <p className="ob-char-count">{description.length}/500</p>
        </div>

        <div className="ob-form-grid">
          <div className="ob-form-group">
            <label className="ob-label">Phone number</label>
            <input
              className="ob-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="ob-form-group">
            <label className="ob-label">
              Website <span className="ob-label-optional">(optional)</span>
            </label>
            <input
              className="ob-input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yoursalon.com"
            />
          </div>
        </div>
      </div>

      {/* ── Booking Settings ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Booking Settings</p>
            <p className="ob-card-sub">Control when and how far ahead clients can book.</p>
          </div>
        </div>

        <div className="ob-form-grid">
          <div className="ob-form-group">
            <label className="ob-label">Maximum advance booking</label>
            <select className="ob-select">
              <option value={30}>1 month</option>
              <option value={60}>2 months</option>
              <option value={90}>3 months</option>
              <option value={180}>6 months</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Minimum notice period</label>
            <select className="ob-select">
              <option value={0}>No notice required</option>
              <option value={1}>1 hour</option>
              <option value={4}>4 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Cancellation notice</label>
            <select className="ob-select">
              <option value={0}>No restriction</option>
              <option value={2}>2 hours before</option>
              <option value={12}>12 hours before</option>
              <option value={24}>24 hours before</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Slot interval</label>
            <select className="ob-select">
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>

        <div className="ob-info-banner">
          <InfoCircle size={16} className="ob-info-icon" />
          <p className="ob-info-text">
            <strong>Advance booking & notice periods</strong> control when clients can start and end
            booking appointments online. These settings apply to all services unless overridden at
            service level.
          </p>
        </div>
      </div>

      {/* ── Business Hours ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">
              <Clock size={16} style={{ marginRight: 7, verticalAlign: "middle" }} />
              Business Hours
            </p>
            <p className="ob-card-sub">
              Set your opening times shown to clients on your booking page.
            </p>
          </div>
        </div>

        {DAYS.map((day) => {
          const h = hours[day];
          return (
            <div key={day} className="ob-hours-row">
              <div className="ob-hours-day">{day}</div>
              {h.open ? (
                <div className="ob-hours-times">
                  <input
                    type="time"
                    className="ob-input"
                    value={h.from}
                    onChange={(e) => updateHour(day, "from", e.target.value)}
                  />
                  <span className="ob-hours-sep">to</span>
                  <input
                    type="time"
                    className="ob-input"
                    value={h.to}
                    onChange={(e) => updateHour(day, "to", e.target.value)}
                  />
                </div>
              ) : (
                <span className="ob-hours-closed">Closed</span>
              )}
              <label className="ob-switch">
                <input
                  type="checkbox"
                  checked={h.open}
                  onChange={(e) => updateHour(day, "open", e.target.checked)}
                />
                <span className="ob-switch-track">
                  <span className="ob-switch-thumb" />
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {/* ── Booking Link Preview ── */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Your Booking Link</p>
            <p className="ob-card-sub">Share this link with clients to let them book directly.</p>
          </div>
        </div>
        <div className="ob-link-display">
          <Globe size={14} style={{ flexShrink: 0, color: "#6b7280" }} />
          <span className="ob-link-url">https://book.salonox.com/my-salon</span>
          <button className="ob-copy-btn">Copy</button>
        </div>
      </div>
    </div>
  );
}
