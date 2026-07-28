import { useEffect, useState } from "react";
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
import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import { STAFF } from "../../../services/api/endpoints/staff.endpoints";
import { LINK_BUILDER } from "../../../services/api/endpoints/linkBuilder.endpoints";
import "../styles/OnlineBooking.scss";

const PRESETS = [
  {
    id: "any",
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

type ServiceOption = { id: string; name: string };
type StaffOption = { id: string; name: string };

export default function LinkBuilderPage() {
  const [preset, setPreset]         = useState<"any" | "service" | "staff">("any");
  const [services, setServices]     = useState<ServiceOption[]>([]);
  const [staff, setStaff]           = useState<StaffOption[]>([]);
  const [serviceId, setServiceId]   = useState<string>("");
  const [staffId, setStaffId]       = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);

  const [link, setLink]             = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

  const [copied, setCopied]         = useState(false);
  const [showQR, setShowQR]         = useState(false);

  // ── Load salon's real services & staff ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadingData(true);
      try {
        const [svcRes, staffRes] = await Promise.allSettled([
          api.get(SERVICES.LIST("status=active")),
          api.get(`${STAFF.BASE}?is_active=true`),
        ]);

        if (!cancelled && svcRes.status === "fulfilled") {
          const rows = svcRes.value.data?.data?.data ?? [];
          setServices(Array.isArray(rows) ? rows.map((s: any) => ({ id: s.id, name: s.name })) : []);
        }
        if (!cancelled && staffRes.status === "fulfilled") {
          const rows = staffRes.value.data?.data?.items ?? [];
          setStaff(
            Array.isArray(rows)
              ? rows.map((s: any) => ({
                  id: s.id,
                  name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Staff",
                }))
              : []
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Default the pickers once options arrive
  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0].id);
  }, [services, serviceId]);
  useEffect(() => {
    if (!staffId && staff.length > 0) setStaffId(staff[0].id);
  }, [staff, staffId]);

  // ── Generate the real booking link whenever the selection changes ──────────
  useEffect(() => {
    if (preset === "service" && !serviceId) return;
    if (preset === "staff" && !staffId) return;

    let cancelled = false;
    async function generate() {
      setGenerating(true);
      setGenError(null);
      try {
        const body =
          preset === "service" ? { type: "service", serviceId } :
          preset === "staff"   ? { type: "staff", staffId } :
          { type: "any" };
        const res = await api.post(LINK_BUILDER.GENERATE, body);
        if (!cancelled) setLink(res.data?.data?.bookingUrl ?? null);
      } catch (err: any) {
        if (!cancelled) {
          setLink(null);
          setGenError(err?.message || "Failed to generate booking link");
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [preset, serviceId, staffId]);

  const handleCopy = () => {
    if (!link) return;
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
              onClick={() => setPreset(p.id as typeof preset)}
            >
              <div className="ob-preset-icon">{p.icon}</div>
              <p className="ob-preset-label">{p.label}</p>
              <p className="ob-preset-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters (conditional) ── */}
      {preset !== "any" && (
        <div className="ob-card">
          <p className="ob-card-title" style={{ marginBottom: 16 }}>
            {preset === "service" ? "Select service" : "Select staff member"}
          </p>
          {preset === "service" && (
            <div className="ob-form-group">
              <label className="ob-label">Service</label>
              {loadingData ? (
                <p className="ob-card-sub">Loading services…</p>
              ) : services.length === 0 ? (
                <p className="ob-card-sub">No active services found. Add one in Catalog first.</p>
              ) : (
                <select
                  className="ob-select"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {preset === "staff" && (
            <div className="ob-form-group">
              <label className="ob-label">Staff member</label>
              {loadingData ? (
                <p className="ob-card-sub">Loading staff…</p>
              ) : staff.length === 0 ? (
                <p className="ob-card-sub">No active staff found. Add one in Staff first.</p>
              ) : (
                <select
                  className="ob-select"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
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
          <span className="ob-link-url">
            {generating ? "Generating…" : genError ? genError : link ?? "—"}
          </span>
          <button
            className={`ob-copy-btn ${copied ? "ob-copy-btn--copied" : ""}`}
            onClick={handleCopy}
            disabled={!link || generating}
          >
            {copied ? <><ClipboardCheck size={13} /> Copied!</> : <><Clipboard size={13} /> Copy</>}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            className="ob-btn-outline"
            disabled={!link}
            onClick={() => link && window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, "_blank")}
          >
            <Share size={14} /> Share via WhatsApp
          </button>
          <button className="ob-btn-outline" disabled={!link} onClick={() => setShowQR(!showQR)}>
            <QrCode size={14} /> {showQR ? "Hide QR code" : "Generate QR code"}
          </button>
        </div>

        {showQR && link && (
          <div className="ob-qr-area" style={{ marginTop: 20 }}>
            <div className="ob-qr-placeholder">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`}
                alt="Booking link QR code"
                width={140}
                height={140}
              />
            </div>
            <p className="ob-qr-label">
              Scan to open the booking page.
              <br />
              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
                Print or embed on flyers, menus, or your website.
              </span>
            </p>
            <a
              className="ob-btn-outline"
              style={{ fontSize: 12.5, textDecoration: "none" }}
              href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(link)}`}
              download="booking-qr-code.png"
              target="_blank"
              rel="noreferrer"
            >
              Download PNG
            </a>
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
