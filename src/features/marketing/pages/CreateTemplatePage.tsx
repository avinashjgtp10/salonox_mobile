import { useState, useRef, useMemo } from "react";  // ← add useMemo
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { createTemplateThunk } from "../../../middleware/marketing/marketing.thunk";
import { Button, Input, Select, PageHeader } from "../../../components/ui";
import { useOnce } from "../../../hooks/useOnce";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import type { HeaderType, ButtonType, TemplateButton } from "../../../types/marketing.types";
import "../styles/CreateTemplatePage.scss";

const CATEGORIES = [
  { value: "MARKETING",      label: "📢 Marketing",      desc: "Promotions & offers — ₹0.88/msg" },
  { value: "UTILITY",        label: "🔧 Utility",        desc: "Reminders & confirmations — ₹0.125/msg" },
  { value: "AUTHENTICATION", label: "🔐 Authentication", desc: "OTPs & verification — ₹0.125/msg" },
];

const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "hi_IN", label: "Hindi" },
  { value: "mr_IN", label: "Marathi" },
  { value: "ta_IN", label: "Tamil" },
  { value: "te_IN", label: "Telugu" },
  { value: "gu_IN", label: "Gujarati" },
  { value: "kn_IN", label: "Kannada" },
  { value: "ml_IN", label: "Malayalam" },
  { value: "pa_IN", label: "Punjabi" },
];

const NAME_LIMIT   = 512; // Meta's own cap on template name length
const BODY_LIMIT   = 1024;
const HEADER_LIMIT = 60;
const FOOTER_LIMIT = 60;

// Meta's WhatsApp template header media caps — exceeding these gets rejected at template submission
const MAX_HEADER_FILE_SIZE: Record<"image" | "video" | "document", number> = {
  image:    5  * 1024 * 1024,  // 5MB
  video:    16 * 1024 * 1024,  // 16MB
  document: 10 * 1024 * 1024,  // 10MB
};
const MAX_HEADER_FILE_LABEL: Record<"image" | "video" | "document", string> = {
  image: "5MB", video: "16MB", document: "10MB",
};

// ← FIXED: normalize phone for Meta — strips spaces/dashes, ensures + prefix
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("91") && digits.length === 12) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  return digits.startsWith("+") ? digits : "+" + digits;
}

export default function CreateTemplatePage() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({
    name: "", category: "MARKETING", language: "en_US", bodyText: "", footerText: "",
  });
  const [headerType,    setHeaderType]    = useState<HeaderType>("none");
  const [headerText,    setHeaderText]    = useState("");
  const [headerFile,    setHeaderFile]    = useState<File | null>(null);
  const [headerPreview, setHeaderPreview] = useState("");
  const [buttons,       setButtons]       = useState<TemplateButton[]>([]);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { can } = usePermissions();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  // ← FIXED: memoize video URL so it doesn't reset every keystroke
  const videoUrl = useMemo(() => {
    if (headerType === "video" && headerFile) return URL.createObjectURL(headerFile);
    return null;
  }, [headerFile, headerType]);

  const up = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (headerType === "image" || headerType === "video" || headerType === "document") {
      const maxSize = MAX_HEADER_FILE_SIZE[headerType];
      if (file.size > maxSize) {
        setErrors(p => ({
          ...p,
          headerFile: `File is too large — max ${MAX_HEADER_FILE_LABEL[headerType]} for a ${headerType} header (yours: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        }));
        setHeaderFile(null);
        setHeaderPreview("");
        e.target.value = "";
        return;
      }
    }

    setErrors(p => ({ ...p, headerFile: "" }));
    setHeaderFile(file);
    if (headerType === "image") {
      const r = new FileReader();
      r.onload = ev => setHeaderPreview(ev.target?.result as string);
      r.readAsDataURL(file);
    } else {
      setHeaderPreview("");
    }
  };

  const addBtn    = (type: ButtonType) => { if (buttons.length >= 3) return; setButtons(p => [...p, { type, text: "", value: "" }]); };
  const updateBtn = (i: number, k: keyof TemplateButton, v: string) => setButtons(p => p.map((b, idx) => idx === i ? { ...b, [k]: v } : b));
  const removeBtn = (i: number) => setButtons(p => p.filter((_, idx) => idx !== i));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    else if (!/^[a-z0-9_]+$/.test(form.name)) e.name = "Lowercase, numbers and underscores only";
    else if (form.name.length > NAME_LIMIT) e.name = `Must be under ${NAME_LIMIT} characters`;
    if (form.bodyText.length < 10) e.bodyText = "At least 10 characters";
    if (headerType === "text" && !headerText.trim()) e.headerText = "Header text required";
    if (["image", "video", "document"].includes(headerType) && !headerFile) e.headerFile = "Please upload a file";
    buttons.forEach((b, i) => {
      if (!b.text.trim()) e[`btn_${i}`] = "Button text required";
      if (b.type === "url"   && !b.value.trim()) e[`btn_val_${i}`] = "URL required";
      if (b.type === "phone" && !b.value.trim()) e[`btn_val_${i}`] = "Phone number required";
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const [handleSubmit, submitting] = useOnce(async () => {
    if (!can("add_template")) { denyPerm("add_template"); return; }
    if (!validate()) return;
    const fd = new FormData();
    fd.append("name",       form.name);
    fd.append("category",   form.category);
    fd.append("language",   form.language);
    fd.append("headerType", headerType);
    fd.append("bodyText",   form.bodyText);
    if (form.footerText)    fd.append("footerText",  form.footerText);
    if (headerType === "text") fd.append("headerText", headerText);
    if (headerFile)         fd.append("headerFile",  headerFile);

    // ← FIXED: normalize phone numbers before submission
    const normalizedButtons = buttons.map(b => ({
      ...b,
      value: b.type === "phone" ? normalizePhone(b.value) : b.value,
    }));
    fd.append("buttons", JSON.stringify(normalizedButtons));

    const result = await dispatch(createTemplateThunk(fd));
    if (createTemplateThunk.fulfilled.match(result)) {
      showSuccess("Template submitted for Meta approval!");
      navigate("/dashboard/marketing/templates");
    } else {
      showError((result.payload as string) ?? "Failed to submit template");
    }
  });

  const previewBody = (t: string) =>
    t
      .replace(/\{\{1\}\}/g, "<b>Priya</b>")
      .replace(/\{\{2\}\}/g, "<b>30%</b>")
      .replace(/\{\{3\}\}/g, "<b>Jan 15</b>")
      .replace(/\{\{4\}\}/g, "<b>Value4</b>")
      .replace(/\n/g, "<br/>");

  return (
    <div className="ct-page">
      {overlay}
      <PageHeader
        title="Create Template"
        subtitle="Design your WhatsApp message and submit to Meta for approval"
        actions={
          <div className="ct-meta-note">
            Meta reviews templates within minutes to hours.
            You'll be notified when approved or rejected.
          </div>
        }
      />

      <div className="ct-layout">
        <div className="ct-form-col">

          {/* Basic Info */}
          <div className="ct-section">
            <div className="ct-section-title">📝 Basic Info</div>

            <div className="ct-field">
              <label className="ct-label">Template Name *</label>
              <Input
                placeholder="e.g. summer_promo_2025"
                value={form.name}
                error={errors.name}
                containerClass="mb-0"
                maxLength={NAME_LIMIT}
                onChange={e => up("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, NAME_LIMIT))}
              />
              <span className="ct-hint">
                Lowercase letters, numbers and underscores only. Cannot be changed after submission. ({form.name.length}/{NAME_LIMIT})
              </span>
            </div>

            {/* Category cards */}
            <div className="ct-field mb-0">
              <label className="ct-label">Category *</label>
              <div className="ct-category-list">
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.value}
                    className={`ct-category-item ${form.category === cat.value ? "ct-category-item--active" : ""}`}
                    onClick={() => up("category", cat.value)}
                  >
                    <div className="ct-category-top">
                      <span className="ct-category-name">{cat.label}</span>
                      {form.category === cat.value && <span className="ct-category-check">✓</span>}
                    </div>
                    <div className="ct-category-desc">{cat.desc}</div>
                  </div>
                ))}
              </div>
              {form.category === "UTILITY" && (
                <div className="ct-category-warn">
                  ⚠️ If Meta detects promotional content, this will be auto-reclassified as MARKETING (₹0.88/msg). Keep it strictly transactional.
                </div>
              )}
            </div>

            <div className="ct-field mb-0" style={{ marginTop: 14 }}>
              <Select
                label="Language"
                value={form.language}
                onChange={e => up("language", e.target.value)}
                containerClass="mb-0"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </Select>
            </div>
          </div>

          {/* Header */}
          <div className="ct-section">
            <div className="ct-section-title">🖼 Header <span className="ct-optional">Optional</span></div>
            <div className="ct-header-types">
              {(["none", "text", "image", "video", "document"] as HeaderType[]).map(t => (
                <button
                  key={t}
                  className={`ct-header-btn ${headerType === t ? "active" : ""}`}
                  onClick={() => { setHeaderType(t); setHeaderFile(null); setHeaderPreview(""); }}
                >
                  {t === "none" ? "None" : t === "text" ? "📝 Text" : t === "image" ? "🖼 Image" : t === "video" ? "🎬 Video" : "📄 Doc"}
                </button>
              ))}
            </div>

            {headerType === "text" && (
              <div className="ct-field">
                <Input
                  placeholder="Hello {{1}}! Welcome to our salon 🎉"
                  value={headerText}
                  error={errors.headerText}
                  containerClass="mb-0"
                  maxLength={HEADER_LIMIT}
                  onChange={e => setHeaderText(e.target.value)}
                />
                <span className="ct-hint">{headerText.length}/{HEADER_LIMIT} characters</span>
              </div>
            )}

            {["image", "video", "document"].includes(headerType) && (
              <>
                <div
                  className={`ct-upload-zone ${errors.headerFile ? "error" : ""}`}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: "none" }}
                    accept={
                      headerType === "image"    ? "image/jpeg,image/png,image/webp"
                      : headerType === "video"  ? "video/mp4,video/3gpp"
                      : "application/pdf,.doc,.docx"
                    }
                    onChange={handleFile}
                  />
                  {headerType === "image" && headerPreview ? (
                    <img src={headerPreview} alt="preview" className="ct-upload-img" />
                  ) : headerFile ? (
                    <div className="ct-upload-file">
                      {headerType === "video" ? "🎬" : "📄"} {headerFile.name}
                    </div>
                  ) : (
                    <div className="ct-upload-placeholder">
                      {headerType === "video"    ? "🎬 Click to upload video (MP4, max 16MB)"
                       : headerType === "document" ? "📄 Click to upload document (PDF, max 10MB)"
                       : "🖼 Click to upload image (JPG, PNG, WebP, max 5MB)"}
                    </div>
                  )}
                </div>
                {errors.headerFile && <span className="ct-error">{errors.headerFile}</span>}
              </>
            )}
          </div>

          {/* Body — removed variable insert buttons */}
          <div className="ct-section">
            <div className="ct-section-title">💬 Body Message *</div>
            <div className="ct-field">
              <Input
                multiline
                rows={5}
                containerClass="mb-0"
                placeholder="Hi get 20% OFF at Glow Salon!."
                value={form.bodyText}
                error={errors.bodyText}
                onChange={e => up("bodyText", e.target.value.slice(0, BODY_LIMIT))}
              />
              <div className="ct-body-footer">
                <span className={`ct-char-count ${form.bodyText.length > BODY_LIMIT * 0.9 ? "warn" : ""}`}>
                  {form.bodyText.length}/{BODY_LIMIT}
                </span>
              </div>
            </div>
            {/* ← REMOVED: variable insert buttons as requested */}
          </div>

          {/* Footer */}
          <div className="ct-section">
            <div className="ct-section-title">📌 Footer <span className="ct-optional">Optional</span></div>
            <Input
              placeholder="Glow Salon · Reply STOP to unsubscribe"
              value={form.footerText}
              containerClass="mb-0"
              maxLength={FOOTER_LIMIT}
              onChange={e => up("footerText", e.target.value)}
            />
            <span className="ct-hint">{form.footerText.length}/{FOOTER_LIMIT} · Shown in smaller text below the message</span>
          </div>

          {/* Buttons */}
          <div className="ct-section">
            <div className="ct-section-title">🔘 Buttons <span className="ct-optional">Optional · Max 3</span></div>
            {buttons.map((btn, i) => (
              <div key={i} className="ct-btn-item">
                <div className="ct-btn-item-header">
                  <span className="ct-btn-type">
                    {btn.type === "quick_reply" ? "↩ Quick Reply" : btn.type === "url" ? "🔗 URL" : "📞 Phone"}
                  </span>
                  <button className="ct-remove-btn" onClick={() => removeBtn(i)}>✕ Remove</button>
                </div>
                <div className="ct-row-2">
                  <div>
                    <Input
                      placeholder="Button text (max 25 chars)"
                      value={btn.text}
                      containerClass="mb-0"
                      maxLength={25}
                      error={errors[`btn_${i}`]}
                      onChange={e => updateBtn(i, "text", e.target.value)}
                    />
                  </div>
                  {btn.type === "url" && (
                    <Input
                      placeholder="https://yoursalon.com/book"
                      value={btn.value}
                      containerClass="mb-0"
                      error={errors[`btn_val_${i}`]}
                      onChange={e => updateBtn(i, "value", e.target.value)}
                    />
                  )}
                  {btn.type === "phone" && (
                    <div>
                      <Input
                        placeholder="+91 98765 43210"
                        value={btn.value}
                        containerClass="mb-0"
                        error={errors[`btn_val_${i}`]}
                        onChange={e => updateBtn(i, "value", e.target.value)}
                      />
                      <span className="ct-hint">Will be normalized to E.164 format e.g. +919876543210</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {buttons.length < 3 && (
              <div className="ct-add-btns-row">
                <button className="ct-add-btn" onClick={() => addBtn("quick_reply")}>+ Quick Reply</button>
                <button className="ct-add-btn" onClick={() => addBtn("url")}>+ URL Button</button>
                <button className="ct-add-btn" onClick={() => addBtn("phone")}>+ Phone Button</button>
              </div>
            )}
            <div className="ct-btns-hint">Quick Reply — one-tap response · URL — opens a link · Phone — calls a number</div>
          </div>

          {/* Submit */}
          <div className="ct-actions">
            <Button variant="ghost" onClick={() => navigate("/dashboard/marketing/templates")}>← Back</Button>
            <Button
              variant="success"
              loading={submitting}
              disabled={submitting && can("add_template")}
              style={!can("add_template") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleSubmit}
            >
              🚀 Submit to Meta for Approval
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="ct-right-col">
          <div className="ct-preview-label">📱 Live Preview</div>
          <div className="ct-phone">
            <div className="ct-phone-header">
              <div className="ct-phone-avatar">S</div>
              <div>
                <div className="ct-phone-name">Salon Bot</div>
                <div className="ct-phone-status">online</div>
              </div>
            </div>
            <div className="ct-phone-body">
              <div className="ct-message">
                {headerType === "image" && headerPreview && (
                  <img src={headerPreview} alt="header" className="ct-msg-img" />
                )}
                {headerType === "image" && !headerPreview && (
                  <div className="ct-msg-media-placeholder">🖼 Image header</div>
                )}
                {/* ← FIXED: use memoized videoUrl — no reset on keystroke */}
                {headerType === "video" && videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    className="ct-msg-video"
                  />
                )}
                {headerType === "video" && !videoUrl && (
                  <div className="ct-msg-media-placeholder">🎬 Video header</div>
                )}
                {headerType === "document" && headerFile && (
                  <div className="ct-msg-doc">📄 {headerFile.name}</div>
                )}
                {headerType === "document" && !headerFile && (
                  <div className="ct-msg-media-placeholder">📄 Document header</div>
                )}
                {headerType === "text" && headerText && (
                  <div className="ct-msg-header-text">{headerText}</div>
                )}
                <div
                  className="ct-msg-body"
                  dangerouslySetInnerHTML={{ __html: previewBody(form.bodyText || "Your message will appear here...") }}
                />
                {form.footerText && <div className="ct-msg-footer">{form.footerText}</div>}
                <div className="ct-msg-time">10:24 AM ✓✓</div>
              </div>
              {buttons.filter(b => b.text).length > 0 && (
                <div className="ct-msg-buttons">
                  {buttons.filter(b => b.text).map((b, i) => (
                    <div key={i} className="ct-msg-btn">
                      {b.type === "url" ? "🔗" : b.type === "phone" ? "📞" : "↩"} {b.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="ct-tips">
            <div className="ct-tips-title">💡 Tips for faster approval</div>
            <div className="ct-tip">✅ Keep UTILITY templates strictly transactional — no offers</div>
            <div className="ct-tip">✅ Use {"{{1}}, {{2}}"} for personalisation</div>
            <div className="ct-tip">✅ Add opt-out in footer: "Reply STOP to unsubscribe"</div>
            <div className="ct-tip">✅ Avoid ALL CAPS, excessive emojis or spammy language</div>
            <div className="ct-tip">⚠️ UTILITY with promo content → auto-moved to MARKETING</div>
          </div>
        </div>
      </div>
    </div>
  );
}