import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchWaConfigThunk,
  saveWaConfigThunk,
  testWaConfigThunk,
} from "../../../middleware/marketing/marketing.thunk";
import type { SaveWaConfigPayload } from "../../../types/marketing.types";
import "../styles/WaConfigPage.scss";

const TIERS = [
  { value: 250,       label: "250",       desc: "New number" },
  { value: 2000,      label: "2K",        desc: "Basic" },
  { value: 10000,     label: "10K",       desc: "Quality" },
  { value: 100000,    label: "100K",      desc: "High volume" },
  { value: 999999999, label: "Unlimited", desc: "Enterprise" },
];

export default function WaConfigPage() {
  const dispatch = useAppDispatch();
  const { waConfig: config, loading } = useAppSelector((s) => s.marketing);

  const [form, setForm] = useState<SaveWaConfigPayload>({
    phoneNumberId:      "",
    wabaId:             "",
    appId:              "",
    accessToken:        "",
    webhookVerifyToken: "",
  });

  useEffect(() => {
    dispatch(fetchWaConfigThunk());
  }, [dispatch]);

  useEffect(() => {
    if (config) {
      setForm({
        phoneNumberId:      config.phoneNumberId      ?? "",
        wabaId:             config.wabaId             ?? "",
        appId:              config.appId              ?? "",
        accessToken:        "",
        webhookVerifyToken: config.webhookVerifyToken ?? "",
      });
    }
  }, [config]);

  const up = (k: keyof SaveWaConfigPayload, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const result = await dispatch(saveWaConfigThunk(form));
    if (saveWaConfigThunk.fulfilled.match(result)) {
      toast.success("WhatsApp config saved!");
    } else {
      toast.error((result.payload as string) ?? "Failed to save config");
    }
  };

  const handleTest = async () => {
    const result = await dispatch(testWaConfigThunk());
    if (testWaConfigThunk.fulfilled.match(result)) {
      toast.success("Connection successful!");
    } else {
      toast.error((result.payload as string) ?? "Connection failed. Check your credentials.");
    }
  };

  const backendUrl =
    import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? "";
  const webhookUrl = `${backendUrl}/api/v1/webhooks/whatsapp`;

  const tierIndex = TIERS.findIndex(
    (t) => t.value >= (config?.dailyLimit ?? 250),
  );
  const safeIndex = tierIndex === -1 ? TIERS.length - 1 : tierIndex;

  const qualityColor =
    config?.qualityRating === "GREEN"
      ? "#16a34a"
      : config?.qualityRating === "YELLOW"
        ? "#d97706"
        : "#dc2626";

  if (loading.fetchWaConfig) {
    return <div className="wac-loading">Loading config...</div>;
  }

  return (
    <div className="wac-page">
      {/* Header */}
      <div className="wac-page-header">
        <h1 className="wac-page-title">WhatsApp Configuration</h1>
        <p className="wac-page-sub">
          Connect your Meta Cloud API credentials
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`wac-banner ${config?.isVerified ? "verified" : "unverified"}`}
      >
        <span className="wac-banner-icon">
          {config?.isVerified ? "✅" : "⚠️"}
        </span>
        <div>
          <div className="wac-banner-title">
            {config?.isVerified
              ? `Connected — ${config.displayPhone ?? "WhatsApp Business API"}`
              : "Not configured — Enter your Meta credentials below"}
          </div>
          <div className="wac-banner-sub">
            {config?.isVerified
              ? "Your WhatsApp Business number is active and ready to send messages"
              : "Each salon connects their own WhatsApp Business number via Meta Cloud API"}
          </div>
        </div>
      </div>

      {/* Messaging Limits */}
      {config?.isVerified && (
        <div className="wac-card">
          <div className="wac-card-header">
            <div className="wac-card-title">📊 Messaging Limits</div>
            <span className="wac-card-note">Updated by Meta automatically</span>
          </div>
          <div className="wac-limits">
            <div className="wac-limits-top">
              <div>
                <div className="wac-limit-num">
                  {(config.dailyLimit ?? 0) >= 999999999
                    ? "Unlimited"
                    : (config.dailyLimit ?? 250).toLocaleString("en-IN")}
                </div>
                <div className="wac-limit-sub">
                  messages per 24h rolling window
                </div>
              </div>
              <div
                className="wac-quality-pill"
                style={{
                  color: qualityColor,
                  borderColor: qualityColor + "40",
                  background: qualityColor + "10",
                }}
              >
                {config.qualityRating === "GREEN"
                  ? "🟢 High Quality"
                  : config.qualityRating === "YELLOW"
                    ? "🟡 Medium"
                    : "🔴 Low Quality"}
              </div>
            </div>
            <div className="wac-tier-track">
              {TIERS.map((tier, i) => (
                <div
                  key={tier.value}
                  className="wac-tier-segment"
                  style={{ background: i <= safeIndex ? "#3b82f6" : "#e5e7eb" }}
                />
              ))}
            </div>
            <div className="wac-tier-labels">
              {TIERS.map((tier, i) => (
                <div
                  key={tier.value}
                  className={`wac-tier-label ${i === safeIndex ? "active" : ""}`}
                >
                  <div className="wac-tier-val">{tier.label}</div>
                  <div className="wac-tier-desc">{tier.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credentials */}
      <div className="wac-card">
        <div className="wac-card-title">📱 Meta Cloud API Credentials</div>
        <div className="wac-form">
          {(
            [
              { key: "phoneNumberId",      label: "Phone Number ID",                     hint: "Found in Meta Business Suite → WhatsApp → API Setup",          type: "text",     placeholder: "e.g. 123456789012345" },
              { key: "wabaId",             label: "WhatsApp Business Account ID (WABA)", hint: "",                                                             type: "text",     placeholder: "e.g. 987654321098765" },
              { key: "appId",              label: "Facebook App ID",                     hint: "Found in Meta for Developers → Your App → App ID",            type: "text",     placeholder: "e.g. 61587901141164" },
              { key: "accessToken",        label: "Permanent Access Token",              hint: "Leave empty to keep your existing token",                      type: "password", placeholder: "Enter new token to update..." },
              { key: "webhookVerifyToken", label: "Webhook Verify Token",                hint: "A random secret string you choose",                            type: "text",     placeholder: "your-secret-verify-token" },
            ] as { key: keyof SaveWaConfigPayload; label: string; hint: string; type: string; placeholder: string }[]
          ).map((f) => (
            <div key={f.key} className="wac-field">
              <label className="wac-label">{f.label}</label>
              <input
                className="wac-input"
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => up(f.key, e.target.value)}
              />
              {f.hint && <span className="wac-hint">{f.hint}</span>}
            </div>
          ))}
          <div className="wac-form-actions">
            <button
              className="wac-btn-outline"
              onClick={handleTest}
              disabled={loading.testWaConfig}
            >
              {loading.testWaConfig ? "Testing..." : "🔌 Test Connection"}
            </button>
            <button
              className="wac-btn-primary"
              onClick={handleSave}
              disabled={loading.saveWaConfig}
            >
              {loading.saveWaConfig ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Setup */}
      <div className="wac-card">
        <div className="wac-card-title">🔗 Webhook Setup</div>
        <p className="wac-webhook-desc">
          Add this URL in your Meta App Dashboard → WhatsApp → Configuration →
          Webhook:
        </p>
        <div className="wac-webhook-url">{webhookUrl}</div>
        <div className="wac-webhook-notes">
          <div>
            ✅ Subscribe to:{" "}
            <strong>messages, message_deliveries, message_reads</strong>
          </div>
          <div>✅ Use the Verify Token you entered above</div>
        </div>
      </div>
    </div>
  );
}
