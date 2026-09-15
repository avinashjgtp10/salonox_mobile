import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  testWaConfigThunk,
  deleteWaConfigThunk,
  setAiReceptionistEnabledThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { useWaCredentialsSave, type WaCredentialsForm } from "../hooks/useWaCredentialsSave";
import { Button, Input, Modal, PageHeader } from "../../../components/ui";
import { API_ORIGIN } from "../../../services/api/baseUrl";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import "../styles/WaConfigPage.scss";

const FIELDS: {
  key:         keyof WaCredentialsForm;
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

  const [form, setForm] = useState<WaCredentialsForm>({
    phoneNumberId: "", wabaId: "", appId: "",
    appSecret: "", accessToken: "", webhookVerifyToken: "",
  });

  const [testing,       setTesting]       = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { can } = usePermissions();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));
  const {
    saving, fieldErrors, generalError, hasUnchecked, suggestedToken,
    clearErrors, verifyAndSave, useSuggestedToken,
  } = useWaCredentialsSave();

  const toggleVisible = (key: string) =>
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const up = (k: keyof WaCredentialsForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    clearErrors();
  };

  const handleSave = async () => {
    if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
    const ok = await verifyAndSave(form);
    if (ok) {
      showSuccess("WhatsApp config saved!");
      setEditMode(false);
    }
  };

  const handleDelete = async () => {
    if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
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
    if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
    const result = await dispatch(setAiReceptionistEnabledThunk(enabled));
    if (setAiReceptionistEnabledThunk.fulfilled.match(result)) {
      showSuccess(enabled ? "AI receptionist enabled" : "AI receptionist disabled");
    } else {
      showError((result.payload as string) ?? "Failed to update AI receptionist setting");
    }
  };

  const handleTest = async () => {
    if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
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
      <PageHeader
        title="WhatsApp Configuration"
        subtitle="Connect your Meta Cloud API credentials to enable WhatsApp messaging"
      />

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
            style={!can("edit_whatsapp_config") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={() => {
              if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
              setEditMode(e => !e);
            }}
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
              disabled={loading.setAiReceptionistEnabled && can("edit_whatsapp_config")}
              style={!can("edit_whatsapp_config") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
            {FIELDS.map((f) => {
              const hasError = !!fieldErrors[f.key];
              return (
                <div key={f.key} className="wac-field">
                  <label className="wac-label">{f.label}</label>
                  <Input
                    type={f.type === "password" && visibleFields[f.key] ? "text" : f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    error={fieldErrors[f.key]}
                    containerClass="mb-0"
                    onChange={(e) => up(f.key, e.target.value)}
                    iconRight={
                      f.type === "password" ? (
                        <button
                          type="button"
                          className="wac-eye-toggle"
                          tabIndex={-1}
                          aria-label={visibleFields[f.key] ? `Hide ${f.label}` : `Show ${f.label}`}
                          onClick={() => toggleVisible(f.key)}
                        >
                          {visibleFields[f.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      ) : undefined
                    }
                  />
                  {!hasError && <span className="wac-hint">📍 {f.hint}</span>}

                  {f.key === "webhookVerifyToken" && hasError && (
                    <div className="wac-token-suggestion">
                      <span>💡 Suggested unique token:</span>
                      <code>{suggestedToken}</code>
                      <button type="button" onClick={() => up("webhookVerifyToken", useSuggestedToken())}>
                        Use this →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

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

            {generalError && (
              <div className="wac-verify-error">❌ {generalError}</div>
            )}

            {hasUnchecked && (
              <div className="wac-unchecked-banner">
                ⚠️ Fix the errors above first, then click <strong>Save Configuration</strong> again —
                we'll check the remaining credentials once these are correct.
              </div>
            )}

            <div className="wac-form-actions">
              <Button
                variant="ghost"
                loading={testing}
                disabled={(testing || saving) && can("edit_whatsapp_config")}
                style={!can("edit_whatsapp_config") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={handleTest}
              >
                🔌 Test Connection
              </Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={(saving || testing) && can("edit_whatsapp_config")}
                style={!can("edit_whatsapp_config") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={handleSave}
              >
                {saving ? "Verifying with Meta…" : "Verify & Save"}
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
              style={!can("edit_whatsapp_config") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (!can("edit_whatsapp_config")) { denyPerm("edit_whatsapp_config"); return; }
                setConfirmOpen(true);
              }}
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