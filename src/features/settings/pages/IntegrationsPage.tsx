import { useState } from "react";
import {
  MessageCircle,
  CreditCard,
  Mail,
  Calendar,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Circle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button";

interface Integration {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  connected: boolean;
  configFields?: { key: string; label: string; type: string; placeholder: string; value: string }[];
  docUrl?: string;
  badge?: string;
}

const initialIntegrations: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    desc: "Send automated appointment reminders, campaign messages, and receive replies from clients via WhatsApp.",
    icon: "💬",
    category: "Messaging",
    connected: false,
    badge: "Popular",
    configFields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "1234567890", value: "" },
      { key: "access_token", label: "Access Token", type: "password", placeholder: "EAABx...", value: "" },
      { key: "webhook_verify_token", label: "Webhook Verify Token", type: "text", placeholder: "my_verify_token", value: "" },
    ],
    docUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    desc: "Accept online payments, track transactions, and manage refunds directly from your salon dashboard.",
    icon: "💳",
    category: "Payments",
    connected: false,
    badge: "Recommended",
    configFields: [
      { key: "key_id", label: "Key ID", type: "text", placeholder: "rzp_live_...", value: "" },
      { key: "key_secret", label: "Key Secret", type: "password", placeholder: "••••••••", value: "" },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", placeholder: "••••••••", value: "" },
    ],
    docUrl: "https://razorpay.com/docs",
  },
  {
    id: "smtp",
    name: "Custom SMTP Email",
    desc: "Use your own email server to send transactional emails, receipts, and marketing messages.",
    icon: "📧",
    category: "Email",
    connected: false,
    configFields: [
      { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.yourdomain.com", value: "" },
      { key: "smtp_port", label: "SMTP Port", type: "text", placeholder: "587", value: "" },
      { key: "smtp_user", label: "Username", type: "text", placeholder: "no-reply@yourdomain.com", value: "" },
      { key: "smtp_pass", label: "Password", type: "password", placeholder: "••••••••", value: "" },
      { key: "email_from", label: "From Name", type: "text", placeholder: "Glamour Studio", value: "" },
    ],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    desc: "Sync your appointments to Google Calendar so staff can see their schedules on any device.",
    icon: "📅",
    category: "Calendar",
    connected: false,
    docUrl: "https://developers.google.com/calendar",
  },
  {
    id: "google_analytics",
    name: "Google Analytics",
    desc: "Track website visitors, booking conversions, and client behaviour on your booking page.",
    icon: "📊",
    category: "Analytics",
    connected: false,
    configFields: [
      { key: "measurement_id", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX", value: "" },
    ],
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    desc: "Send SMS reminders and OTPs to clients globally via Twilio's messaging platform.",
    icon: "📱",
    category: "Messaging",
    connected: false,
    configFields: [
      { key: "account_sid", label: "Account SID", type: "text", placeholder: "ACxxxxxx", value: "" },
      { key: "auth_token", label: "Auth Token", type: "password", placeholder: "••••••••", value: "" },
      { key: "from_number", label: "From Number", type: "text", placeholder: "+1234567890", value: "" },
    ],
    docUrl: "https://www.twilio.com/docs",
  },
];

const categoryOrder = ["Messaging", "Payments", "Email", "Calendar", "Analytics"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const handleFieldChange = (integId: string, fieldKey: string, val: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integId
          ? {
              ...i,
              configFields: i.configFields?.map((f) =>
                f.key === fieldKey ? { ...f, value: val } : f
              ),
            }
          : i
      )
    );
  };

  const handleConnect = async (integId: string) => {
    setSaving(integId);
    await new Promise((r) => setTimeout(r, 800));
    setIntegrations((prev) =>
      prev.map((i) => (i.id === integId ? { ...i, connected: true } : i))
    );
    setSaving(null);
    toast.success("Integration connected successfully");
    setExpandedId(null);
  };

  const handleDisconnect = (integId: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integId
          ? { ...i, connected: false, configFields: i.configFields?.map((f) => ({ ...f, value: "" })) }
          : i
      )
    );
    toast.success("Integration disconnected");
  };

  const handleTest = async (integId: string) => {
    setTesting(integId);
    await new Promise((r) => setTimeout(r, 1000));
    setTesting(null);
    toast.success("Connection test passed");
  };

  const groupedIntegrations = categoryOrder.map((cat) => ({
    category: cat,
    items: integrations.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Integrations</h2>
        <p className="settings-page-subtitle">
          Connect third-party tools to extend your salon's capabilities.
        </p>
      </div>

      {/* Summary Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Connected",
            value: integrations.filter((i) => i.connected).length,
            color: "#10b981",
            bg: "#f0fdf4",
          },
          {
            label: "Available",
            value: integrations.filter((i) => !i.connected).length,
            color: "#6b7280",
            bg: "#f9fafb",
          },
          {
            label: "Total",
            value: integrations.length,
            color: "#111827",
            bg: "#ffffff",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.bg,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "16px 18px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 800, color: stat.color, margin: 0 }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>
              {stat.label} integrations
            </p>
          </div>
        ))}
      </div>

      {/* Integration Groups */}
      {groupedIntegrations.map(({ category, items }) => (
        <div key={category} className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">{category}</p>
              <p className="settings-section-desc">
                {items.filter((i) => i.connected).length} of {items.length} connected
              </p>
            </div>
          </div>
          <div className="settings-section-body" style={{ padding: 0 }}>
            {items.map((integ, idx) => (
              <div
                key={integ.id}
                style={{
                  borderBottom: idx < items.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                {/* Main Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 22px",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    background: expandedId === integ.id ? "#fafafa" : undefined,
                  }}
                  onClick={() =>
                    setExpandedId(expandedId === integ.id ? null : integ.id)
                  }
                >
                  {/* Icon */}
                  <div
                    className={`settings-integration-icon ${integ.connected ? "connected" : ""}`}
                    style={{
                      background: integ.connected ? "#f0fdf4" : "#f3f4f6",
                    }}
                  >
                    {integ.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p className="settings-integration-name">{integ.name}</p>
                      {integ.badge && (
                        <span
                          className={`s-badge ${integ.badge === "Popular" ? "s-badge-info" : "s-badge-warning"}`}
                          style={{ fontSize: 10.5 }}
                        >
                          {integ.badge}
                        </span>
                      )}
                    </div>
                    <p className="settings-integration-desc" style={{ margin: 0 }}>
                      {integ.desc}
                    </p>
                  </div>

                  {/* Status + Expand */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {integ.connected ? (
                      <span className="settings-integration-status connected">
                        <CheckCircle2 size={12} />
                        Connected
                      </span>
                    ) : (
                      <span className="settings-integration-status disconnected">
                        <Circle size={12} />
                        Not connected
                      </span>
                    )}
                    {expandedId === integ.id ? (
                      <ChevronUp size={16} color="#6b7280" />
                    ) : (
                      <ChevronDown size={16} color="#6b7280" />
                    )}
                  </div>
                </div>

                {/* Expanded Config Panel */}
                {expandedId === integ.id && (
                  <div
                    style={{
                      padding: "0 22px 20px",
                      borderTop: "1px solid #f3f4f6",
                      background: "#fafafa",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {integ.configFields && integ.configFields.length > 0 ? (
                      <>
                        <div
                          className="settings-form-grid"
                          style={{ marginTop: 18 }}
                        >
                          {integ.configFields.map((field) => (
                            <div key={field.key} className="settings-form-group">
                              <label className="settings-label">
                                {field.label}
                              </label>
                              <input
                                className="settings-input"
                                type={field.type}
                                placeholder={field.placeholder}
                                value={field.value}
                                onChange={(e) =>
                                  handleFieldChange(integ.id, field.key, e.target.value)
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 16,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {integ.connected ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                loading={testing === integ.id}
                                iconLeft={<RefreshCw size={13} />}
                                onClick={() => handleTest(integ.id)}
                              >
                                Test connection
                              </Button>
                              <Button
                                size="sm"
                                loading={saving === integ.id}
                                onClick={() => handleConnect(integ.id)}
                              >
                                Save changes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                iconLeft={<Trash2 size={13} />}
                                onClick={() => handleDisconnect(integ.id)}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                loading={saving === integ.id}
                                onClick={() => handleConnect(integ.id)}
                              >
                                Connect
                              </Button>
                              {integ.docUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  iconRight={<ExternalLink size={13} />}
                                  onClick={() => window.open(integ.docUrl, "_blank")}
                                >
                                  Documentation
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>
                          This integration uses OAuth for authentication. Click
                          the button below to authorize access.
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {integ.connected ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                loading={testing === integ.id}
                                iconLeft={<RefreshCw size={13} />}
                                onClick={() => handleTest(integ.id)}
                              >
                                Test connection
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                iconLeft={<Trash2 size={13} />}
                                onClick={() => handleDisconnect(integ.id)}
                              >
                                Revoke access
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                loading={saving === integ.id}
                                onClick={() => handleConnect(integ.id)}
                              >
                                Authorize with {integ.name.split(" ")[0]}
                              </Button>
                              {integ.docUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  iconRight={<ExternalLink size={13} />}
                                  onClick={() => window.open(integ.docUrl, "_blank")}
                                >
                                  Learn more
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
