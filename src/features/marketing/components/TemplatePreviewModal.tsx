import { useEffect } from "react";
import type { Template } from "../../../types/marketing.types";
import "../styles/TemplatePreviewModal.scss";

interface Props {
  template: Template;
  onClose: () => void;
}

function previewBody(text: string): string {
  return text
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~(.+?)~/g, "<s>$1</s>")
    .replace(/{{(\d+)}}/g, '<span class="tpm-var">{{$1}}</span>');
}

function headerIcon(type: string) {
  if (type === "video")    return "▶";
  if (type === "document") return "📄";
  return null;
}

export default function TemplatePreviewModal({ template, onClose }: Props) {
  const body      = template.body_text  ?? template.bodyText  ?? "";
  const footer    = template.footer_text ?? null;
  const hType     = template.header_type ?? "none";
  const hText     = template.header_text ?? null;
  const buttons   = template.buttons    ?? [];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="tpm-overlay" onClick={onClose}>
      <div className="tpm-panel" onClick={(e) => e.stopPropagation()}>

        {/* Panel header */}
        <div className="tpm-panel-header">
          <div className="tpm-panel-meta">
            <span className="tpm-panel-name">{template.name}</span>
            <div className="tpm-panel-tags">
              <span className="tpm-tag">{template.category}</span>
              <span className="tpm-tag">{template.language}</span>
            </div>
          </div>
          <button className="tpm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* WhatsApp phone mockup */}
        <div className="tpm-phone">
          <div className="tpm-phone-bar">
            <div className="tpm-phone-avatar">S</div>
            <div>
              <div className="tpm-phone-name">Salon Bot</div>
              <div className="tpm-phone-status">online</div>
            </div>
          </div>

          <div className="tpm-phone-body">
            <div className="tpm-bubble">

              {/* Header */}
              {hType === "text" && hText && (
                <div className="tpm-msg-header-text">{hText}</div>
              )}
              {(hType === "image") && (
                <div className="tpm-media-placeholder image">
                  <span className="tpm-media-icon">🖼</span>
                  <span>Image</span>
                </div>
              )}
              {(hType === "video") && (
                <div className="tpm-media-placeholder video">
                  <span className="tpm-media-icon">{headerIcon("video")}</span>
                  <span>Video</span>
                </div>
              )}
              {(hType === "document") && (
                <div className="tpm-media-placeholder document">
                  <span className="tpm-media-icon">{headerIcon("document")}</span>
                  <span>Document</span>
                </div>
              )}

              {/* Body */}
              <div
                className="tpm-msg-body"
                dangerouslySetInnerHTML={{ __html: previewBody(body || "—") }}
              />

              {/* Footer */}
              {footer && <div className="tpm-msg-footer">{footer}</div>}

              {/* Timestamp */}
              <div className="tpm-msg-time">
                {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
              </div>
            </div>

            {/* Buttons */}
            {buttons.filter((b) => b.text).length > 0 && (
              <div className="tpm-buttons">
                {buttons.filter((b) => b.text).map((b, i) => (
                  <div key={i} className="tpm-btn">
                    {b.type === "phone" && <span className="tpm-btn-icon">📞</span>}
                    {b.type === "url"   && <span className="tpm-btn-icon">🔗</span>}
                    {b.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Approved stamp */}
        <div className="tpm-approved-badge">✓ Approved by Meta</div>
      </div>
    </div>
  );
}