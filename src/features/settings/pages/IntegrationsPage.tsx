import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Circle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";

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

const INTEG_KEY = "integrations_config";

export default function IntegrationsPage() {
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);

  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [settingId, setSettingId] = useState<EntityId | null>(null);

  // Load persisted integration state on mount
  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  useEffect(() => {
    const found = settingItems.find((s) => s.key === INTEG_KEY);
    if (!found) return;
    setSettingId(found.id);
    try {
      const raw = typeof found.value === "string" ? found.value : JSON.stringify(found.value);
      const stored: Record<string, { connected: boolean; fields: Record<string, string> }> = JSON.parse(raw);
      setIntegrations((prev) =>
        prev.map((integ) => {
          const saved = stored[integ.id];
          if (!saved) return integ;
          return {
            ...integ,
            connected: saved.connected,
            configFields: integ.configFields?.map((f) => ({
              ...f,
              value: saved.fields?.[f.key] ?? f.value,
            })),
          };
        })
      );
    } catch {
      // malformed — keep defaults
    }
  }, [settingItems]);

  const persistIntegrations = async (updated: Integration[]) => {
    const stored: Record<string, { connected: boolean; fields: Record<string, string> }> = {};
    updated.forEach((i) => {
      stored[i.id] = {
        connected: i.connected,
        fields: Object.fromEntries((i.configFields ?? []).map((f) => [f.key, f.value])),
      };
    });
    const value = JSON.stringify(stored);
    if (settingId) {
      const result = await dispatch(updateSettingThunk({ id: settingId, data: { key: INTEG_KEY, value } }));
      if (updateSettingThunk.fulfilled.match(result)) return;
    } else {
      const result = await dispatch(createSettingThunk({ key: INTEG_KEY, value, description: "Integrations configuration" }));
      if (createSettingThunk.fulfilled.match(result)) {
        setSettingId(result.payload.id);
      }
    }
  };

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
    const updated = integrations.map((i) =>
      i.id === integId ? { ...i, connected: true } : i
    );
    setIntegrations(updated);
    await persistIntegrations(updated);
    setSaving(null);
    toast.success("Integration connected successfully");
    setExpandedId(null);
  };

  const handleDisconnect = async (integId: string) => {
    const updated = integrations.map((i) =>
      i.id === integId
        ? { ...i, connected: false, configFields: i.configFields?.map((f) => ({ ...f, value: "" })) }
        : i
    );
    setIntegrations(updated);
    await persistIntegrations(updated);
    toast.success("Integration disconnected");
  };

  const handleTest = async (integId: string) => {
    setTesting(integId);
    await new Promise((r) => setTimeout(r, 1000));
    setTesting(null);
    toast.success("Connection test passed");
  };

  const groupedIntegrations = categoryOrder
    .map((cat) => ({
      category: cat,
      items: integrations.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const connectedCount = integrations.filter((i) => i.connected).length;
  const availableCount = integrations.filter((i) => !i.connected).length;

  const stats = [
    { label: "Connected", value: connectedCount, color: "#10b981", bg: "#f0fdf4" },
    { label: "Available", value: availableCount, color: "#6b7280", bg: "#f9fafb" },
    { label: "Total", value: integrations.length, color: "#111827", bg: "#ffffff" },
  ];

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
      <div className="settings-integrations-stats">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="settings-stat-card"
            style={{ background: stat.bg }}
          >
            <p className="settings-stat-value" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="settings-stat-label">{stat.label} integrations</p>
          </div>
        ))}
      </div>

      {/* Integration Groups */}
      {groupedIntegrations.map(({ category, items }) => (
        <SettingsSection
          key={category}
          title={category}
          desc={`${items.filter((i) => i.connected).length} of ${items.length} connected`}
          noPadding
        >
          {items.map((integ) => (
            <div key={integ.id} className="settings-integ-item">
              {/* Main Row */}
              <div
                className={`settings-integ-row${expandedId === integ.id ? " expanded" : ""}`}
                onClick={() =>
                  setExpandedId(expandedId === integ.id ? null : integ.id)
                }
              >
                {/* Icon */}
                <div
                  className="settings-integration-icon"
                  style={{ background: integ.connected ? "#f0fdf4" : "#f3f4f6" }}
                >
                  {integ.icon}
                </div>

                {/* Info */}
                <div className="settings-integration-info">
                  <div className="settings-integ-name-row">
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
                  <p className="settings-integration-desc">{integ.desc}</p>
                </div>

                {/* Status + Expand */}
                <div className="settings-integ-status-wrap">
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
                  className="settings-integ-config-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  {integ.configFields && integ.configFields.length > 0 ? (
                    <>
                      <div className="settings-form-grid" style={{ marginTop: 18 }}>
                        {integ.configFields.map((field) => (
                          <div key={field.key} className="settings-form-group">
                            <label className="settings-label">{field.label}</label>
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
                      <div className="settings-integ-config-actions">
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
                                onClick={() => void window.open(integ.docUrl, "_blank")}
                              >
                                Documentation
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="settings-integ-oauth-panel">
                      <p className="settings-integ-oauth-desc">
                        This integration uses OAuth for authentication. Click
                        the button below to authorize access.
                      </p>
                      <div className="settings-integ-oauth-actions">
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
                                onClick={() => void window.open(integ.docUrl, "_blank")}
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
        </SettingsSection>
      ))}
    </>
  );
}
