import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { updateEmailTemplateThunk, sendTestMessageThunk } from "../../../middleware/marketing/notification-channels.thunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Button, Input } from "../../../components/ui";
import VariableChips from "./VariableChips";
import type { PurchaseEventType, NotificationChannelTemplate } from "../../../types/marketing.types";
import "../styles/ChannelSection.scss";

interface Props {
  salonId: string;
  eventType: PurchaseEventType;
  tpl: NotificationChannelTemplate | undefined;
}

export default function ChannelEmailSection({ salonId, eventType, tpl }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useStatusOverlay();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Input forwards a ref typed for either element (it renders <input> or
  // <textarea> depending on `multiline`) — matched here even though this
  // usage is always the <input> branch.
  const subjectRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const [subject, setSubject] = useState(tpl?.subject ?? "");
  const [body, setBody] = useState(tpl?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  // Tracks which field a variable chip click should insert into — defaults
  // to body since that's the far more common target.
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  useEffect(() => {
    setSubject(tpl?.subject ?? "");
    setBody(tpl?.body ?? "");
  }, [tpl?.id, tpl?.updated_at]);

  const dirty = subject !== (tpl?.subject ?? "") || body !== (tpl?.body ?? "");

  const insertToken = (token: string) => {
    const insertText = `{{${token}}}`;
    if (activeField === "subject") {
      const el = subjectRef.current;
      const start = el?.selectionStart ?? subject.length;
      const end = el?.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + insertText + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => { el?.focus(); const pos = start + insertText.length; el?.setSelectionRange(pos, pos); });
    } else {
      const el = bodyRef.current;
      const start = el?.selectionStart ?? body.length;
      const end = el?.selectionEnd ?? body.length;
      const next = body.slice(0, start) + insertText + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => { el?.focus(); const pos = start + insertText.length; el?.setSelectionRange(pos, pos); });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await dispatch(updateEmailTemplateThunk({ salonId, eventType, subject, body }));
      if (updateEmailTemplateThunk.fulfilled.match(res)) showSuccess("Email content saved");
      else showError((res.payload as string) ?? "Failed to save email content");
    } finally {
      setSaving(false);
    }
  };

  // Fires a real send through the currently-configured SMTP account — a
  // fixed test message, not this template's draft, since the point is
  // checking the provider is wired up, not previewing wording.
  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    try {
      const res = await dispatch(sendTestMessageThunk({ salonId, channel: "email", to: testEmail.trim() }));
      if (sendTestMessageThunk.fulfilled.match(res)) showSuccess("Test email sent");
      else showError((res.payload as string) ?? "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="ch-section">
      <label className="ch-label">Subject</label>
      <Input
        ref={subjectRef}
        value={subject}
        placeholder="Email subject..."
        containerClass="mb-0"
        onFocus={() => setActiveField("subject")}
        onChange={(e) => setSubject(e.target.value)}
      />

      <label className="ch-label">Body</label>
      <textarea
        ref={bodyRef}
        className="ch-textarea"
        rows={6}
        value={body}
        placeholder="Email body..."
        onFocus={() => setActiveField("body")}
        onChange={(e) => setBody(e.target.value)}
      />

      {eventType === "bill_receipt" && (
        <span className="ch-badge">📎 PDF bill attached automatically</span>
      )}

      <VariableChips eventType={eventType} onInsert={insertToken} />
      <div className="ch-actions">
        <div className="ch-test-row">
          <input
            type="email"
            className="ch-test-input"
            placeholder="Email address"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <Button size="sm" variant="outline-secondary" loading={testing} disabled={testing || !testEmail.trim()} onClick={handleSendTest}>
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
