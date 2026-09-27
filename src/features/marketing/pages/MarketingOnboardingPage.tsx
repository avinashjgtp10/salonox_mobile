import React, { useState } from "react";
import { API_ORIGIN } from "../../../services/api/baseUrl";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useWaCredentialsSave, type WaCredentialsForm } from "../hooks/useWaCredentialsSave";
import "../styles/MarketingOnboardingPage.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
type Stage = "landing" | "requirements" | "setup";

// ── Constants ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "📣", title: "Blast Campaigns",     desc: "Send WhatsApp messages to thousands of customers at once with approved templates." },
  { icon: "📊", title: "Real-time Analytics", desc: "Track delivery, read rates and campaign performance with live dashboards." },
  { icon: "💬", title: "Two-way Inbox",       desc: "Reply to customer messages directly from SalonoX. Full conversation history." },
  { icon: "📐", title: "Template Manager",    desc: "Create, submit and manage WhatsApp message templates for Meta approval." },
  { icon: "⏰", title: "Schedule Campaigns",  desc: "Schedule campaigns to go out at the perfect time for maximum engagement." },
  { icon: "🎯", title: "Smart Targeting",     desc: "Upload contacts or pick from existing salon clients for targeted messaging." },
];

const REQUIREMENTS = [
  {
    icon: "👤", title: "Personal Facebook Account",
    items: ["Active Facebook account", "Mobile number linked to Facebook", "Email-verified Facebook account"],
    warning: "",
  },
  {
    icon: "🏢", title: "Business Information",
    items: ["Business Name & Category", "Business Address & Email", "Contact Number", "Website (optional but recommended)"],
    warning: "",
  },
  {
    icon: "📄", title: "Documents for Verification",
    items: ["GST Certificate", "Identity Proof"],
    warning: "",
  },
  {
    icon: "📱", title: "Mobile Number for WhatsApp",
    items: ["Active mobile number", "Must be able to receive OTP", "Should NOT be linked to existing WhatsApp account"],
    warning: "If the number is already on WhatsApp Messenger or WhatsApp Business App, you may need to delete that account first. We recommend using a fresh number.",
  },
];

const SETUP_STEPS = [
  {
    step: 1, title: "Create Meta Business Account",
    desc: "Create your Meta Business Portfolio to manage your WhatsApp business account.",
    link: "https://business.facebook.com/overview", linkText: "Open Meta Business Portfolio",
    actions: [
      "Click Create Account",
      "Enter Business Name, Your Name, Business Email",
      "Click Submit and verify your email",
    ],
    warning: null,
  },
  {
    step: 2, title: "Create Meta Developer App",
    desc: "Create a Facebook App to get API access for WhatsApp messaging.",
    link: "https://developers.facebook.com/apps", linkText: "Open Meta for Developers",
    actions: [
      "Click Create App",
      "Select: Connect with customers through WhatsApp",
      "Enter App Name and Contact Email",
      "Select your Business Portfolio and click Create App",
    ],
    warning: null,
  },
  {
    step: 3, title: "Add WhatsApp Product",
    desc: "Add WhatsApp to your app to enable the Cloud API.",
    link: null, linkText: null,
    actions: [
      "Open your app dashboard",
      "Scroll to WhatsApp and click Set Up",
      "Meta will create a test WhatsApp Business Account automatically",
    ],
    warning: null,
  },
  {
    step: 4, title: "Find Your Phone Number ID & WABA ID",
    desc: "Copy these two IDs from the API Setup page — you will enter them on the final step.",
    link: null, linkText: null,
    actions: [
      "Go to WhatsApp → API Setup in your app dashboard",
      "Note down the Phone Number ID",
      "Note down the WhatsApp Business Account ID (WABA ID)",
      "Keep this tab open — you will need these on the final step",
    ],
    warning: null,
  },
  {
    step: 5, title: "Find Your App ID & App Secret",
    desc: "Copy these from App Settings — you will enter them on the final step.",
    link: null, linkText: null,
    actions: [
      "Go to App Settings → Basic in your app dashboard",
      "Note down the App ID",
      "Click Show next to App Secret, enter your Facebook password if asked",
      "Note down the App Secret — do NOT click Generate after copying",
    ],
    warning: null,
  },
  {
    step: 6, title: "Generate Permanent Access Token",
    desc: "Create a System User with a token that never expires. Keep it safe — you will enter it on the final step.",
    link: "https://business.facebook.com/settings", linkText: "Open Business Portfolio Settings",
    actions: [
      "Go to Business Portfolio Settings → Users → System Users",
      "Click +Add, enter a System User Name, select Admin, click Create",
      "Open the System User → Add Assets → assign your WhatsApp Account and Facebook App with Full Control",
      "Click Generate New Token, enable whatsapp_business_messaging & whatsapp_business_management, click Generate Token",
      "Copy and store the token securely — it will not be shown again",
    ],
    warning: "Temporary tokens expire in 24 hours and will break your campaigns. Always use a System User permanent token.",
  },
  {
    step: 7, title: "Enter Credentials & Connect",
    desc: "Paste all your credentials below. We will verify everything with Meta before saving.",
    link: null, linkText: null,
    actions: [
      "Go to WhatsApp → Configuration in your app dashboard",
      "Paste the Callback URL shown below into the Webhook URL field in Meta",
      "Create a unique Webhook Verify Token (e.g. webhook_verify_glowsalon) and paste it below AND in Meta",
      "Click Verify and Save in Meta",
      "Subscribe to: messages, message_deliveries, message_reads, message_template_status_update",
    ],
    warning: null,
  },
];

const CREDENTIAL_FIELDS: {
  key:         keyof WaCredentialsForm;
  label:       string;
  placeholder: string;
  type:        string;
  hint:        string;
}[] = [
  {
    key:         "phoneNumberId",
    label:       "Phone Number ID",
    placeholder: "e.g. 910037188870426",
    type:        "text",
    hint:        "WhatsApp → API Setup in your app dashboard",
  },
  {
    key:         "wabaId",
    label:       "WhatsApp Business Account ID (WABA ID)",
    placeholder: "e.g. 1845597292806971",
    type:        "text",
    hint:        "WhatsApp → API Setup in your app dashboard",
  },
  {
    key:         "appId",
    label:       "Facebook App ID",
    placeholder: "e.g. 61587901141164",
    type:        "text",
    hint:        "App Settings → Basic → App ID",
  },
  {
    key:         "appSecret",
    label:       "App Secret",
    placeholder: "Paste your App Secret here",
    type:        "password",
    hint:        "App Settings → Basic → App Secret (click Show)",
  },
  {
    key:         "accessToken",
    label:       "Permanent System User Access Token",
    placeholder: "Paste your permanent access token here",
    type:        "password",
    hint:        "Business Settings → System Users → Generate Token",
  },
  {
    key:         "webhookVerifyToken",
    label:       "Webhook Verify Token",
    placeholder: "e.g. webhook_verify_glowsalon",
    type:        "text",
    hint:        "Must be unique per salon — must match exactly what you enter in Meta webhook settings",
  },
];

// ── Landing Stage ─────────────────────────────────────────────────────────────
function LandingStage({ onStart }: { onStart: () => void }) {
  return (
    <div className="mob-landing">
      <div className="mob-landing-hero">
        <div className="mob-landing-badge">✨ WhatsApp Marketing</div>
        <h1 className="mob-landing-title">
          {"Grow Your Salon Business"}
          <br />
          <span className="mob-landing-highlight">Through WhatsApp</span>
        </h1>
        <p className="mob-landing-sub">
          Reach your customers directly on WhatsApp — send promotions, appointment reminders
          and offers to thousands of clients with a single click.
        </p>
        <div className="mob-landing-cta-row">
          <button className="mob-cta-primary" onClick={onStart}>
            Get Started — It&apos;s Free →
          </button>
          <div className="mob-landing-meta">
            <span>⏱ Setup takes ~20 minutes</span>
            <span>·</span>
            <span>🔒 Powered by Meta Cloud API</span>
          </div>
        </div>
      </div>

      <div className="mob-landing-stats">
        {[
          { val: "98%",  label: "WhatsApp open rate"  },
          { val: "3×",   label: "More replies vs SMS" },
          { val: "10K+", label: "Messages per day"    },
        ].map(s => (
          <div key={s.label} className="mob-stat">
            <div className="mob-stat-val">{s.val}</div>
            <div className="mob-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mob-features-grid">
        {FEATURES.map(f => (
          <div key={f.title} className="mob-feature-card">
            <div className="mob-feature-icon">{f.icon}</div>
            <div className="mob-feature-title">{f.title}</div>
            <div className="mob-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="mob-landing-footer">
        <button className="mob-cta-primary mob-cta-large" onClick={onStart}>
          Connect WhatsApp Now →
        </button>
        <p className="mob-landing-footer-note">
          You&apos;ll need a Meta Business Account and a phone number. We&apos;ll guide you step by step.
        </p>
      </div>
    </div>
  );
}

// ── Requirements Stage ────────────────────────────────────────────────────────
function RequirementsStage({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = REQUIREMENTS.every((_, i) => checked[i]);

  return (
    <div className="mob-stage">
      <div className="mob-stage-header">
        <button className="mob-back-btn" onClick={onBack}>← Back</button>
        <div className="mob-progress">
          <div className="mob-progress-bar">
            <div className="mob-progress-fill" style={{ width: "14%" }} />
          </div>
          <span className="mob-progress-label">Step 0 of 7 — Requirements</span>
        </div>
      </div>

      <div className="mob-stage-content">
        <div className="mob-stage-icon">📋</div>
        <h2 className="mob-stage-title">Before You Begin</h2>
        <p className="mob-stage-sub">Make sure you have these ready. Check each one to continue.</p>

        <div className="mob-requirements">
          {REQUIREMENTS.map((req, i) => (
            <div
              key={i}
              className={"mob-req-card" + (checked[i] ? " mob-req-card--done" : "")}
              onClick={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
            >
              <div className="mob-req-check">{checked[i] ? "✅" : "⬜"}</div>
              <div className="mob-req-body">
                <div className="mob-req-title">{req.icon + " " + req.title}</div>
                <ul className="mob-req-items">
                  {req.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
                {req.warning ? <div className="mob-req-warning">{"⚠️ " + req.warning}</div> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mob-note">
          <strong>📡 No server setup needed</strong>
          {" — SalonoX provides the webhook URL. You just copy and paste it in Meta."}
        </div>

        <button
          className="mob-cta-primary mob-cta-full"
          disabled={!allChecked}
          onClick={onNext}
        >
          {allChecked ? "I'm Ready — Start Setup →" : "Check all " + REQUIREMENTS.length + " items to continue"}
        </button>
      </div>
    </div>
  );
}

// ── Setup Stage ───────────────────────────────────────────────────────────────
// Verification + save behavior lives in useWaCredentialsSave, shared with
// WaConfigPage — a salon gets the same live-validated experience whether
// they arrive here (guided first-time setup) or edit credentials directly
// later. Only the field UI and step-wizard shell stay local to this page.
function SetupStage({ onBack }: { onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form,        setForm]        = useState<WaCredentialsForm>({
    phoneNumberId: "", wabaId: "", appId: "",
    appSecret: "", accessToken: "", webhookVerifyToken: "",
  });
  const [copied,          setCopied]          = useState(false);
  const [requiredErrors,  setRequiredErrors]  = useState<Partial<Record<keyof WaCredentialsForm, string>>>({});
  const { showSuccess, overlay } = useStatusOverlay();
  const {
    saving, fieldErrors, generalError, hasUnchecked, suggestedToken,
    clearErrors, verifyAndSave, useSuggestedToken,
  } = useWaCredentialsSave();

  const step       = SETUP_STEPS[currentStep];
  const isLastStep = currentStep === SETUP_STEPS.length - 1;
  const progress   = Math.round(((currentStep + 1) / SETUP_STEPS.length) * 100);
  const webhookUrl = `${API_ORIGIN}/api/v1/webhooks/whatsapp`;

  const allErrors = { ...requiredErrors, ...fieldErrors };

  const up = (key: keyof WaCredentialsForm, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setRequiredErrors(prev => ({ ...prev, [key]: undefined }));
    clearErrors();
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showSuccess("Webhook URL copied!");
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep(s => s + 1);
      setRequiredErrors({});
      clearErrors();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onBack();
    } else {
      setCurrentStep(s => s - 1);
      setRequiredErrors({});
      clearErrors();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const validateRequired = (): boolean => {
    const errors: Partial<Record<keyof WaCredentialsForm, string>> = {};
    if (!form.phoneNumberId.trim())      errors.phoneNumberId      = "Phone Number ID is required";
    if (!form.wabaId.trim())             errors.wabaId             = "WABA ID is required";
    if (!form.appId.trim())              errors.appId              = "App ID is required";
    if (!form.appSecret.trim())          errors.appSecret          = "App Secret is required";
    if (!form.accessToken.trim())        errors.accessToken        = "Access Token is required";
    if (!form.webhookVerifyToken.trim()) errors.webhookVerifyToken = "Webhook Verify Token is required";
    setRequiredErrors(errors);
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstError = document.querySelector(".mob-field-input--error");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return false;
    }
    return true;
  };

  const handleFinish = async () => {
    if (!validateRequired()) return;
    const ok = await verifyAndSave(form);
    if (ok) {
      showSuccess("✅ WhatsApp configured successfully!");
    } else {
      setTimeout(() => {
        const firstError = document.querySelector(".mob-field-input--error");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  return (
    <div className="mob-stage">
      {overlay}
      <div className="mob-stage-header">
        <button className="mob-back-btn" onClick={handleBack}>← Back</button>
        <div className="mob-progress">
          <div className="mob-progress-bar">
            <div className="mob-progress-fill" style={{ width: progress + "%" }} />
          </div>
          <span className="mob-progress-label">
            {"Step " + (currentStep + 1) + " of " + SETUP_STEPS.length}
          </span>
        </div>
      </div>

      <div className="mob-stage-content">
        <div className="mob-step-badge">{"Step " + step.step}</div>
        <h2 className="mob-stage-title">{step.title}</h2>
        <p className="mob-stage-sub">{step.desc}</p>

        {/* Meta link */}
        {step.link && step.linkText && React.createElement(
          "a",
          { href: step.link, target: "_blank", rel: "noopener noreferrer", className: "mob-meta-link" },
          "🔗 " + step.linkText + " →"
        )}

        {/* Warning */}
        {step.warning && (
          <div className="mob-step-warning">{"⚠️ " + step.warning}</div>
        )}

        {/* Actions list */}
        <div className="mob-actions-list">
          <div className="mob-actions-title">What to do:</div>
          {step.actions.map((action, i) => (
            <div key={i} className="mob-action-item">
              <div className="mob-action-num">{i + 1}</div>
              <div className="mob-action-text">{action}</div>
            </div>
          ))}
        </div>

        {/* ── STEP 7 ONLY: webhook URL + all credential fields ── */}
        {isLastStep && (
          <>
            {/* Webhook callback URL */}
            <div className="mob-webhook-box">
              <div className="mob-webhook-label">📡 Your Webhook Callback URL (paste this into Meta)</div>
              <div className="mob-webhook-row">
                <div className="mob-webhook-url">{webhookUrl}</div>
                <button className="mob-webhook-copy" onClick={handleCopyWebhook}>
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* General error — network or unmapped failures only */}
            {generalError && (
              <div className="mob-verify-error">
                ❌ {generalError}
              </div>
            )}

            {/* Unchecked banner — backend exited early */}
            {hasUnchecked && (
              <div className="mob-unchecked-banner">
                ⚠️ Fix the errors above first, then click <strong>Verify & Finish Setup</strong> again —
                we will check the remaining credentials once these are correct.
              </div>
            )}

            {/* All 6 credential fields */}
            <div className="mob-field-group">
              {CREDENTIAL_FIELDS.map(f => {
                const hasError = !!allErrors[f.key];
                return (
                  <div key={f.key} className="mob-field">
                    <label className="mob-field-label">{f.label}</label>
                    <input
                      className={"mob-field-input" + (hasError ? " mob-field-input--error" : "")}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => up(f.key, e.target.value)}
                      autoComplete="off"
                    />
                    {hasError
                      ? <span className="mob-field-error">❌ {allErrors[f.key]}</span>
                      : <span className="mob-field-hint">📍 {f.hint}</span>
                    }

                    {/* Suggestion chip — only for webhook token when taken */}
                    {f.key === "webhookVerifyToken" && hasError && (
                      <div className="mob-token-suggestion">
                        <span className="mob-token-suggestion-label">💡 Suggested unique token:</span>
                        <code className="mob-token-suggestion-value">{suggestedToken}</code>
                        <button
                          className="mob-token-suggestion-btn"
                          onClick={() => up("webhookVerifyToken", useSuggestedToken())}
                        >
                          Use this →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Loading spinner */}
        {saving && (
          <div className="mob-verify-loading">
            <div className="mob-verify-spinner" />
            <span>Verifying credentials with Meta API…</span>
          </div>
        )}

        {/* Next / Finish button */}
        <button
          className="mob-cta-primary mob-cta-full"
          disabled={saving}
          onClick={handleNext}
        >
          {saving
            ? "Verifying & Saving…"
            : isLastStep
            ? "✅ Verify & Finish Setup"
            : "Continue →"}
        </button>

        {/* Step dots */}
        <div className="mob-step-dots">
          {SETUP_STEPS.map((_, i) => (
            <div
              key={i}
              className={
                "mob-dot" +
                (i === currentStep ? " mob-dot--active" : i < currentStep ? " mob-dot--done" : "")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MarketingOnboardingPage() {
  const [stage, setStage] = useState<Stage>("landing");

  return (
    <div className="mob-page">
      {stage === "landing" && (
        <LandingStage onStart={() => setStage("requirements")} />
      )}
      {stage === "requirements" && (
        <RequirementsStage
          onNext={() => setStage("setup")}
          onBack={() => setStage("landing")}
        />
      )}
      {stage === "setup" && (
        <SetupStage onBack={() => setStage("requirements")} />
      )}
    </div>
  );
}