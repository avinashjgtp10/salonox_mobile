import { useEffect, useState } from "react";
import Modal from "../../../components/ui/Modal";
import { Button, Input } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchTemplatesThunk, createCampaignThunk } from "../../../middleware/marketing/marketing.thunk";
import { useOnce } from "../../../hooks/useOnce";
import { toTitleCase } from "../../../utils/titleCase";
import "../styles/SendCampaignModal.scss";

export interface CampaignContact {
  phone: string;
  name?: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  /** Whichever rows the caller (a report page) currently has selected. */
  contacts: CampaignContact[];
  /** Pre-fills the campaign name — e.g. "Package Expiring Reminder". */
  defaultCampaignName?: string;
  /** Called after a successful send, e.g. so the caller can clear its selection. */
  onSent?: () => void;
}

const BATCH_SIZES = [20, 50, 100];

function cleanPhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("0")) p = "+91" + p.slice(1);
  if (!p.startsWith("+")) p = "+91" + p;
  return p;
}

// Reusable across any report/list page that already has a filtered set of
// clients on screen — pass their {phone, name} rows in and this handles
// picking a template and sending, without re-deriving the contact list via
// Excel upload or Smart Filter the way the full New Campaign page does.
export default function SendCampaignModal({ show, onClose, contacts: rawContacts, defaultCampaignName, onSent }: Props) {
  const dispatch = useAppDispatch();
  const { templates, waConfig } = useAppSelector((s) => s.marketing);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [name,       setName]       = useState(defaultCampaignName ?? "");
  const [templateId, setTemplateId] = useState("");
  const [batchSize,  setBatchSize]  = useState(50);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  // Line-item-level reports (e.g. Product Sale — one row per product on an
  // invoice) can select multiple rows belonging to the same client, which
  // would otherwise send them the same message once per selected row.
  // De-duping here protects every caller, not just the ones careful enough
  // to dedupe their own selection first.
  const contacts = Array.from(
    new Map(rawContacts.map(c => [cleanPhone(c.phone), c])).values()
  );

  const dailyLimit = waConfig?.dailyLimit ?? (waConfig as any)?.daily_limit ?? 0;
  const approved   = templates.filter((t) => t.status === "APPROVED");
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const isOverLimit = dailyLimit > 0 && contacts.length > dailyLimit;

  useEffect(() => { if (show && templates.length === 0) dispatch(fetchTemplatesThunk()); }, [show, dispatch, templates.length]);
  // Fresh state each time it's opened for a new selection — a stale name/
  // template from the last send shouldn't silently carry over.
  useEffect(() => {
    if (show) {
      setName(defaultCampaignName ?? "");
      setTemplateId("");
      setErrors({});
    }
  }, [show, defaultCampaignName]);

  const [handleSend, sending] = useOnce(async () => {
    const e: Record<string, string> = {};
    if (!name.trim())    e.name = "Campaign name is required";
    if (!templateId)     e.templateId = "Please select an approved template";
    if (!contacts.length) e.contacts = "No contacts selected";
    else if (dailyLimit > 0 && contacts.length > dailyLimit) {
      e.contacts = `${contacts.length.toLocaleString()} contacts exceeds your daily limit of ${dailyLimit.toLocaleString()}.`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    const result = await dispatch(createCampaignThunk({
      name:         toTitleCase(name.trim()),
      template_id:  templateId,
      batch_size:   batchSize,
      scheduled_at: null,
      contacts:     contacts.map(c => ({ phone: cleanPhone(c.phone), name: c.name ?? "", variables: {} })),
    }));
    if (createCampaignThunk.fulfilled.match(result)) {
      showSuccess("Campaign launched!");
      onSent?.();
      onClose();
    } else {
      showError((result.payload as string) ?? "Failed to launch campaign");
    }
  });

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Send Campaign"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" loading={sending} disabled={sending || isOverLimit} onClick={handleSend}>
            🚀 Send to {contacts.length.toLocaleString()} contact{contacts.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      {overlay}
      <div className="scm-body">
        <div className="scm-count">
          <strong>{contacts.length.toLocaleString()}</strong> contact{contacts.length === 1 ? "" : "s"} selected
          {dailyLimit > 0 && <span className="scm-count-limit"> / {dailyLimit.toLocaleString()} daily limit</span>}
        </div>

        <div className="scm-field">
          <label className="scm-label">Campaign Name *</label>
          <Input
            placeholder="e.g. Package Expiring Reminder"
            value={name}
            error={errors.name}
            containerClass="mb-0"
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
          />
        </div>

        <div className="scm-field">
          <label className="scm-label">WhatsApp Template *</label>
          {templates.length === 0 ? (
            <p className="scm-hint">No templates yet — create one under Marketing → Templates.</p>
          ) : (
            <Dropdown
              searchable
              placeholder="Select a template"
              value={templateId}
              options={templates.map(t => ({
                id: t.id as string,
                name: t.status === "APPROVED" ? t.name : `${t.name} (${t.status})`,
                disabled: t.status !== "APPROVED",
              }))}
              onChange={id => { setTemplateId(id); setErrors(p => ({ ...p, templateId: "" })); }}
            />
          )}
          {errors.templateId && <span className="scm-error">{errors.templateId}</span>}
          {templates.length > 0 && approved.length === 0 && (
            <p className="scm-hint">⏳ No approved templates yet.</p>
          )}
        </div>

        <div className="scm-field">
          <label className="scm-label">Batch Size</label>
          <div className="scm-batch-pills">
            {BATCH_SIZES.map(n => (
              <label key={n} className={`scm-batch-pill${batchSize === n ? " active" : ""}`}>
                <input type="radio" name="scm-batch" checked={batchSize === n} onChange={() => setBatchSize(n)} />
                {n}
              </label>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <div className="scm-field">
            <label className="scm-label">Message Preview</label>
            <div className="scm-wa-bubble">
              <p>{selectedTemplate.body_text ?? selectedTemplate.bodyText ?? ""}</p>
            </div>
          </div>
        )}

        {errors.contacts && <span className="scm-error">{errors.contacts}</span>}
        {isOverLimit && !errors.contacts && (
          <div className="scm-over-limit">
            🚫 {contacts.length.toLocaleString()} contacts exceeds your daily limit of {dailyLimit.toLocaleString()}.
          </div>
        )}
      </div>
    </Modal>
  );
}
