import { Info, X } from "lucide-react";
import { Button, Input, Badge } from "../../../components/ui";
import ChannelSmsSection from "./ChannelSmsSection";
import ChannelEmailSection from "./ChannelEmailSection";
import type { PurchaseEventType, PurchaseTemplate, NotificationChannelTemplate } from "../../../types/marketing.types";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  APPROVED: "success", PENDING: "warning", REJECTED: "danger", DRAFT: "secondary",
};

interface EventMeta { label: string; hint: string }
interface VariableExplanation { token: string; meaning: string }

interface Props {
  salonId: string;
  eventType: PurchaseEventType;
  meta: EventMeta;
  variableExplanations: VariableExplanation[];
  isCaptionOnly: boolean;

  // ── WhatsApp (unchanged behavior, just relocated) ─────────────────────────
  tpl: PurchaseTemplate | undefined;
  draftText: string;
  onDraftChange: (text: string) => void;
  isBusy: boolean;
  infoOpen: boolean;
  onToggleInfo: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onSync: () => void;

  // ── WhatsApp channel enabled toggle (existing salon-automation-settings) ──
  waEnabled: boolean;
  onToggleWaEnabled: (enabled: boolean) => void;

  // ── SMS / Email (new) ──────────────────────────────────────────────────────
  smsTpl: NotificationChannelTemplate | undefined;
  emailTpl: NotificationChannelTemplate | undefined;
  onToggleSmsEnabled: (enabled: boolean) => void;
  onToggleEmailEnabled: (enabled: boolean) => void;
}

export default function TriggerEventCard({
  salonId, eventType, meta, variableExplanations, isCaptionOnly,
  tpl, draftText, onDraftChange, isBusy, infoOpen, onToggleInfo, onSave, onSubmit, onReset, onSync,
  waEnabled, onToggleWaEnabled,
  smsTpl, emailTpl, onToggleSmsEnabled, onToggleEmailEnabled,
}: Props) {
  const status = tpl?.status ?? "DRAFT";
  const isLive = !isCaptionOnly && status === "APPROVED";
  const pendingStatus = tpl?.pending_status ?? null;

  const smsEnabled = smsTpl?.enabled ?? false;
  const emailEnabled = emailTpl?.enabled ?? false;

  return (
    <div className="tp-card">
      <div className="tp-card-head">
        <div>
          <div className="tp-card-label">
            {meta.label}
            {!isCaptionOnly && <Badge variant={STATUS_VARIANT[status]} pill>{status}</Badge>}
            {pendingStatus && (
              <Badge variant={pendingStatus === "PENDING" ? "warning" : "danger"} pill>
                Update: {pendingStatus}
              </Badge>
            )}
          </div>
          <div className="tp-card-hint">{meta.hint}</div>
        </div>
        <button className="tp-info-btn" onClick={onToggleInfo} title="What do the variables mean?">
          <Info size={15} />
        </button>
      </div>

      {infoOpen && (
        <div className="tp-info-panel">
          <div className="tp-info-panel-head">
            Variables
            <button className="tp-info-close" onClick={onToggleInfo}><X size={13} /></button>
          </div>
          <ul>
            {variableExplanations.map((v) => (
              <li key={v.token}><code>{v.token}</code> — {v.meaning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="tec-channels">
        <label className="tec-channel-toggle">
          <input type="checkbox" checked={waEnabled} onChange={(e) => onToggleWaEnabled(e.target.checked)} />
          WhatsApp
        </label>
        <label className="tec-channel-toggle">
          <input type="checkbox" checked={smsEnabled} onChange={(e) => onToggleSmsEnabled(e.target.checked)} />
          SMS
        </label>
        <label className="tec-channel-toggle">
          <input type="checkbox" checked={emailEnabled} onChange={(e) => onToggleEmailEnabled(e.target.checked)} />
          Email
        </label>
      </div>

      {waEnabled && (
        <>
          {isLive && <div className="tp-live-note">Currently sending — editing below drafts a replacement version</div>}

          <Input
            multiline
            rows={5}
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Message wording..."
            containerClass="mb-0"
          />

          {!isLive && tpl?.status === "REJECTED" && tpl.rejection_reason && (
            <div className="tp-rejection">Rejected by Meta: {tpl.rejection_reason}</div>
          )}
          {isLive && pendingStatus === "REJECTED" && tpl?.pending_rejection_reason && (
            <div className="tp-rejection">Update rejected by Meta: {tpl.pending_rejection_reason}</div>
          )}

          <div className="tp-card-actions">
            <Button size="sm" variant="outline-secondary" loading={isBusy} disabled={isBusy} onClick={onSave}>
              Save
            </Button>

            {!isCaptionOnly && !isLive && (status === "DRAFT" || status === "REJECTED") && (
              <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draftText.trim()} onClick={onSubmit}>
                Submit to Meta
              </Button>
            )}
            {!isCaptionOnly && !isLive && status === "PENDING" && (
              <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={onSync}>
                ↻ Check Status
              </Button>
            )}
            {!isCaptionOnly && !isLive && status === "REJECTED" && (
              <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={onReset}>
                Reset
              </Button>
            )}

            {!isCaptionOnly && isLive && (pendingStatus === null || pendingStatus === "REJECTED") && (
              <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draftText.trim()} onClick={onSubmit}>
                Submit Update
              </Button>
            )}
            {!isCaptionOnly && isLive && pendingStatus === "PENDING" && (
              <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={onSync}>
                ↻ Check Update Status
              </Button>
            )}
            {!isCaptionOnly && isLive && pendingStatus === "REJECTED" && (
              <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={onReset}>
                Dismiss
              </Button>
            )}
          </div>
        </>
      )}

      {smsEnabled && <ChannelSmsSection salonId={salonId} eventType={eventType} tpl={smsTpl} />}
      {emailEnabled && <ChannelEmailSection salonId={salonId} eventType={eventType} tpl={emailTpl} />}
    </div>
  );
}
