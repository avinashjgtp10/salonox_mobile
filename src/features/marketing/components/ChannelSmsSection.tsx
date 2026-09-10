import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { updateSmsTemplateThunk, sendTestMessageThunk } from "../../../middleware/marketing/notification-channels.thunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Button } from "../../../components/ui";
import VariableChips from "./VariableChips";
import { analyzeSmsText } from "../utils/smsSegments";
import { renderSamplePreview } from "../utils/sampleValues";
import type { PurchaseEventType, NotificationChannelTemplate } from "../../../types/marketing.types";
import "../styles/ChannelSection.scss";

interface Props {
  salonId: string;
  eventType: PurchaseEventType;
  tpl: NotificationChannelTemplate | undefined;
}

export default function ChannelSmsSection({ salonId, eventType, tpl }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useStatusOverlay();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState(tpl?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  // Re-sync only when the underlying row actually changes (a fresh fetch,
  // or this exact save landing) — never on every keystroke.
  useEffect(() => { setDraft(tpl?.body ?? ""); }, [tpl?.id, tpl?.updated_at]);

  const dirty = draft !== (tpl?.body ?? "");
  const info = analyzeSmsText(renderSamplePreview(draft));

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    const insertText = `{{${token}}}`;
    if (!el) { setDraft((d) => d + insertText); return; }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + insertText + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertText.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await dispatch(updateSmsTemplateThunk({ salonId, eventType, body: draft }));
      if (updateSmsTemplateThunk.fulfilled.match(res)) showSuccess("SMS wording saved");
      else showError((res.payload as string) ?? "Failed to save SMS wording");
    } finally {
      setSaving(false);
    }
  };

  // Fires a real send through whichever SMS provider is currently
  // configured — a fixed test message, not this template's draft, since
  // the point is checking the provider is wired up, not previewing wording.
  const handleSendTest = async () => {
    if (!testPhone.trim()) return;
    setTesting(true);
    try {
      const res = await dispatch(sendTestMessageThunk({ salonId, channel: "sms", to: testPhone.trim() }));
      if (sendTestMessageThunk.fulfilled.match(res)) showSuccess("Test SMS sent");
      else showError((res.payload as string) ?? "Failed to send test SMS");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="ch-section">
      <textarea
        ref={textareaRef}
        className="ch-textarea"
        rows={4}
        value={draft}
        placeholder="SMS wording..."
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="ch-counter">
        <span className={info.segments > 3 ? "ch-counter-warn" : undefined}>
          {info.effectiveLength}/{info.singleLimit} · {info.segments || 0} segment{info.segments === 1 ? "" : "s"} ({info.encoding})
        </span>
        {info.encoding === "UCS-2" && (
          <span className="ch-counter-note">Contains a character outside GSM-7 — sends as Unicode (70 chars/segment) instead of standard (160 chars/segment).</span>
        )}
      </div>
      <VariableChips eventType={eventType} onInsert={insertToken} />
      <div className="ch-actions">
        <div className="ch-test-row">
          <input
            type="tel"
            className="ch-test-input"
            placeholder="Phone number"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <Button size="sm" variant="outline-secondary" loading={testing} disabled={testing || !testPhone.trim()} onClick={handleSendTest}>
            Send Test
          </Button>
        </div>
        <Button size="sm" variant="outline-secondary" loading={saving} disabled={saving || !dirty} onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
