import { useState, useEffect } from "react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  saveWaConfigThunk,
  testWaConfigThunk,
  deleteWaConfigThunk,
  setAiReceptionistEnabledThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { Button, Input, Modal } from "../../../components/ui";
import { API_ORIGIN } from "../../../services/api/baseUrl";
import type { SaveWaConfigPayload } from "../../../types/marketing.types";
import "../styles/WaConfigPage.scss";

const FIELDS: {
  key:         keyof SaveWaConfigPayload;
  label:       string;
  hint:        string;
  type:        string;
  placeholder: string;
}[] = [
  {
    key:         "phoneNumberId",
    label:       "Phone Number ID *",
    type:        "password",
    placeholder: "e.g. 123456789012345",
    hint:        "Meta for Developers → Your App → WhatsApp → API Setup",
  },
  {
    key:         "wabaId",
    label:       "WhatsApp Business Account ID (WABA) *",
    type:        "password",
    placeholder: "e.g. 987654321098765",
    hint:        "Meta Business Suite → WhatsApp Accounts → Account ID",
  },
  {
    key:         "appId",
    label:       "Facebook App ID *",
    type:        "password",
    placeholder: "e.g. 61587901141164",
    hint:        "Meta for Developers → Your App → App Settings → Basic → App ID",
  },
  {
    key:         "appSecret",
    label:       "App Secret",
    type:        "password",
    placeholder: "Leave empty to keep existing secret",
    hint:        "Meta for Developers → App Settings → Basic → App Secret",
  },
  {
    key:         "accessToken",
    label:       "Permanent System User Access Token",
    type:        "password",
    placeholder: "Leave empty to keep existing token",
    hint:        "Business Settings → Users → System Users → Generate Token (never expires)",
  },
  {
    key:         "webhookVerifyToken",
    label:       "Webhook Verify Token *",
    type:        "password",
    placeholder: "e.g. webhook_verify_glowsalon",
    hint:        "Must be unique per account — recommended format: webhook_verify_YourSalonName",
  },
];

export default function WaConfigPage() {
  const dispatch = useAppDispatch();
  const { waConfig: config, loading, waConfigFetched } = useAppSelector((s) => s.marketing as any);

  const [form, setForm] = useState<SaveWaConfigPayload>({
    phoneNumberId: "", wabaId: "", appId: "",
    appSecret: "", accessToken: "", webhookVerifyToken: "",
  });

  const [saving,        setSaving]        = useState(false);
  const [testing,       setTesting]       = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const webhookUrl = `${API_ORIGIN}/api/v1/webhooks/whatsapp`;

  useEffect(() => {
    if (config) {
      setForm({
        phoneNumberId:      config.phoneNumberId      ?? "",
        wabaId:             config.wabaId             ?? "",
        appId:              (config as any).app_id    ?? "",
        appSecret:          "",
        accessToken:        "",
        webhookVerifyToken: config.webhookVerifyToken ?? "",
      });
      // if already verified, don't show form by default
      if (config.isVerified) setEditMode(false);
      else setEditMode(true);
    } else {
      setEditMode(true);
    }
  }, [config]);

  const up = (k: keyof SaveWaConfigPayload, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await dispatch(saveWaConfigThunk(form));
      if (saveWaConfigThunk.fulfilled.match(result)) {
        showSuccess("WhatsApp config saved!");
        setEditMode(false);
      } else {
        showError((result.payload as string) ?? "Failed to save config");
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await dispatch(deleteWaConfigThunk());
      if (deleteWaConfigThunk.fulfilled.match(result)) {
        showSuccess("WhatsApp connection removed");
        setConfirmOpen(false);
        setEditMode(true);
      } else {
        showError((result.payload as string) ?? "Failed to disconnect WhatsApp");
      }
    } finally { setDeleting(false); }
  };

  const handleToggleAi = async (enabled: boolean) => {
    const result = await dispatch(setAiReceptionistEnabledThunk(enabled));
    if (setAiReceptionistEnabledThunk.fulfilled.match(result)) {
      showSuccess(enabled ? "AI receptionist enabled" : "AI receptionist disabled");
    } else {
      showError((result.payload as string) ?? "Failed to update AI receptionist setting");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await dispatch(testWaConfigThunk());
      if (testWaConfigThunk.fulfilled.match(result)) {
        showSuccess("✅ Connection successful!");
      } else {
        showError((result.payload as string) ?? "Connection failed. Check your credentials.");
      }
    } finally { setTesting(false); }
  };

  if (!waConfigFetched && loading.fetchWaConfig) {
    return <div className="wac-page"><div className="wac-loading">Loading config…</div></div>;
  }

  return (
    <div className="wac-page">
      {overlay}
      <div className="wac-page-header">
        <h1 className="wac-page-title">WhatsApp Configuration</h1>
        <p className="wac-page-sub">Connect your Meta Cloud API credentials to enable WhatsApp messaging</p>
      </div>

      {/* ── Status banner ── */}
      <div className={`wac-banner ${config?.isVerified ? "verified" : "unverified"}`}>
        <span className="wac-banner-icon">{config?.isVerified ? "✅" : "⚠️"}</span>
        <div className="wac-banner-body">
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
        {config?.isVerified && (
          <button
            className="wac-change-btn"
            onClick={() => setEditMode(e => !e)}
          >
            {editMode ? "✕ Cancel" : "✏️ Change Account"}
          </button>
        )}
      </div>

      {/* ── AI Receptionist toggle ── */}
      {config?.isVerified && (
        <div className="wac-card">
          <div className="wac-ai-row">
            <div>
              <div className="wac-card-title">🤖 AI Receptionist</div>
              <p className="wac-ai-desc">
                Automatically replies to customer WhatsApp messages using AI — answers questions,
                checks availability, and can book appointments on your behalf.
              </p>
            </div>
            <button
              type="button"
              className={`wac-toggle${config?.aiReceptionistEnabled ? " wac-toggle--on" : ""}`}
              disabled={loading.setAiReceptionistEnabled}
              onClick={() => handleToggleAi(!config?.aiReceptionistEnabled)}
            >
              <span className="wac-toggle-thumb" />
            </button>
          </div>
        </div>
      )}

      {/* ── Credentials form — only shown in edit mode ── */}
      {editMode && (
        <div className="wac-card">
          <div className="wac-card-title">📱 Meta Cloud API Credentials</div>
          <div className="wac-form">
            {FIELDS.map((f) => (
              <div key={f.key} className="wac-field">
                <label className="wac-label">{f.label}</label>
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  containerClass="mb-0"
                  onChange={(e) => up(f.key, e.target.value)}
                />
                <span className="wac-hint">📍 {f.hint}</span>
              </div>
            ))}

            {/* Webhook URL — read only, shown here so salon can copy */}
            <div className="wac-field">
              <label className="wac-label">Webhook URL</label>
              <div className="wac-webhook-row">
                <div className="wac-webhook-url-box">{webhookUrl}</div>
                <button
                  className="wac-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    showSuccess("Copied!");
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <span className="wac-hint">📍 Paste this in Meta App Dashboard → WhatsApp → Configuration → Webhook URL</span>
            </div>

            {/* Subscribe fields info */}
            <div className="wac-webhook-info">
              <div className="wac-webhook-info-row">
                <span>✅</span>
                <span>Subscribe to: <strong>business_capability_update,message_template_components_update,message_template_quality_update,message_template_status_update,messages,phone_number_quality_update</strong></span>
              </div>
              <div className="wac-webhook-info-row">
                <span>✅</span>
                <span>Verify Token: <strong>{form.webhookVerifyToken || "webhook_verify_YourSalonName"}</strong></span>
              </div>
            </div>

            <div className="wac-form-actions">
              <Button
                variant="ghost"
                loading={testing}
                disabled={testing || saving}
                onClick={handleTest}
              >
                🔌 Test Connection
              </Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={saving || testing}
                onClick={handleSave}
              >
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger zone ── */}
      {config && (
        <div className="wac-card wac-danger-zone">
          <div className="wac-card-title">⚠️ Danger Zone</div>
          <div className="wac-danger-row">
            <div>
              <div className="wac-danger-title">Disconnect WhatsApp</div>
              <p className="wac-danger-desc">
                Removes your Meta credentials from this salon. Templates, campaigns and message
                history are kept — you can reconnect the same or a different WhatsApp number anytime.
              </p>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              🗑 Disconnect
            </Button>
          </div>
        </div>
      )}

      <Modal
        show={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Disconnect WhatsApp?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              loading={deleting}
              disabled={deleting}
              onClick={handleDelete}
            >
              Yes, disconnect
            </Button>
            <Button variant="ghost" fullWidth disabled={deleting} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <p>
          This removes your saved Meta credentials ({config?.displayPhone ?? "this WhatsApp number"}) from
          your salon. You won't be able to send campaigns or messages until you reconnect.
        </p>
      </Modal>
    </div>
  );
}