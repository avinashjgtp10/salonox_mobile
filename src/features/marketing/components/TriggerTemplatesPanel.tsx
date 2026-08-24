import { useEffect, useState, useCallback } from "react";
import { Info, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  fetchPurchaseTemplatesThunk,
  updatePurchaseTemplateThunk,
  submitPurchaseTemplateThunk,
  resetPurchaseTemplateThunk,
  syncPurchaseTemplateThunk,
} from "../../../middleware/marketing/wa-automation.thunk";
import { Button, Input, Badge } from "../../../components/ui";
import type { PurchaseEventType, PurchaseTemplate } from "../../../types/marketing.types";
import "../styles/TriggerTemplatesPanel.scss";

// ── Category grouping ───────────────────────────────────────────────────────
// client_welcome and bill_receipt are shared — they show up under both Quick
// Sale and Calendar (same underlying template either way, edited once).
type TriggerCategory = "quick_sale" | "calendar" | "other";

const CATEGORY_META: Record<TriggerCategory, { label: string; icon: string; desc: string }> = {
  quick_sale: {
    label: "Quick Sale",
    icon:  "ti-shopping-cart",
    desc:  "Fires on a walk-in sale — no appointment involved",
  },
  calendar: {
    label: "Calendar",
    icon:  "ti-calendar-event",
    desc:  "Fires around a scheduled booking — confirmation, reschedule, cancellation, payment",
  },
  other: {
    label: "Other",
    icon:  "ti-dots-circle-horizontal",
    desc:  "Lifecycle alerts, redemptions, and rewards — expiry warnings, session/wallet use, reminders",
  },
};

const EVENT_CATEGORIES: Record<PurchaseEventType, TriggerCategory[]> = {
  client_welcome:    ["quick_sale", "calendar"],
  bill_receipt:      ["quick_sale", "calendar"],

  service_purchased:    ["quick_sale"],
  product_purchased:    ["quick_sale"],
  package_purchased:    ["quick_sale"],
  membership_purchased: ["quick_sale"],

  appointment_confirmation: ["calendar"],
  appointment_rescheduled:  ["calendar"],
  appointment_cancelled:    ["calendar"],
  payment_received:         ["calendar"],

  package_expiring_7d:              ["other"],
  package_expiring_24h:             ["other"],
  membership_expiring_7d:           ["other"],
  membership_expiring_24h:          ["other"],
  package_session_used:             ["other"],
  membership_session_used:          ["other"],
  package_appointment_reminder_24h: ["other"],
  service_reminder_24h:             ["other"],
  reward_points_earned:             ["other"],
  referral_reward:                  ["other"],
};

const CATEGORY_ORDER: TriggerCategory[] = ["quick_sale", "calendar", "other"];

// This one PURCHASE_EVENTS member never goes through Meta template
// submission/approval — it's a caption on the bill's PDF, not a standalone
// template message. Its card shows Save only, no Submit/Reset/Sync.
const CAPTION_ONLY_EVENTS: PurchaseEventType[] = ["bill_receipt"];

const EVENT_LABELS: Record<PurchaseEventType, { label: string; hint: string }> = {
  client_welcome:       { label: "New Client Welcome", hint: "Sent right after a new client is added, from Quick Sale or Calendar" },
  bill_receipt:          { label: "Bill Receipt (Thank You + Feedback)", hint: "Sent as the caption on the bill PDF, right after checkout completes" },
  service_purchased:    { label: "Service Purchased", hint: "Sent when a walk-in Quick Sale includes a service" },
  product_purchased:    { label: "Product Purchased", hint: "Sent when a walk-in Quick Sale includes a retail product" },
  package_purchased:    { label: "Package Purchased", hint: "Sent when a client buys a package (Quick Sale or standalone)" },
  membership_purchased: { label: "Membership Purchased", hint: "Sent when a client buys a membership (Quick Sale or standalone)" },
  appointment_confirmation: { label: "Appointment Confirmation", hint: "Sent right after a new appointment is booked" },
  appointment_rescheduled:  { label: "Appointment Rescheduled", hint: "Sent when an appointment's date or time changes" },
  appointment_cancelled:    { label: "Appointment Cancelled", hint: "Sent when an appointment is cancelled" },
  payment_received:         { label: "Payment Received (Appointment)", hint: "Sent once a Calendar checkout's payment is collected" },
  package_expiring_7d:  { label: "Package Expiring (7 Days)", hint: "Sent 7 days before a client's package expires" },
  package_expiring_24h: { label: "Package Expiring (Tomorrow)", hint: "Sent 1 day before a client's package expires" },
  membership_expiring_7d:  { label: "Membership Expiring (7 Days)", hint: "Sent 7 days before a client's membership expires" },
  membership_expiring_24h: { label: "Membership Expiring (Tomorrow)", hint: "Sent 1 day before a client's membership expires" },
  package_session_used:    { label: "Package Session Used", hint: "Sent every time a session is redeemed from a package" },
  membership_session_used: { label: "Membership Session Used", hint: "Sent every time a membership wallet/session is redeemed" },
  package_appointment_reminder_24h: { label: "Package Appointment Reminder (Tomorrow)", hint: "Sent 1 day before an appointment booked from a package" },
  service_reminder_24h:             { label: "Appointment Reminder (Tomorrow)", hint: "Sent 1 day before any other appointment" },
  reward_points_earned: { label: "Reward Points Earned", hint: "Sent when a client earns reward points on a payment" },
  referral_reward:      { label: "Referral Reward Credited", hint: "Sent to the referrer once their referred client's first bill is paid" },
};

// What each placeholder turns into in the message the customer receives.
// bill_receipt uses named placeholders (it's a caption, not a Meta template,
// so there's no {{n}} numbering rule) — everything else uses Meta's
// sequential {{1}}/{{2}}/{{3}}... syntax.
const VARIABLE_EXPLANATIONS: Record<PurchaseEventType, Array<{ token: string; meaning: string }>> = {
  client_welcome: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
  ],
  bill_receipt: [
    { token: "{{customer_name}}", meaning: "Customer's name" },
    { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{items}}", meaning: "Itemized bill breakdown, built automatically" },
    { token: "{{feedback_link}}", meaning: "Link to rate the visit (omitted for a walk-in with no appointment)" },
  ],
  service_purchased: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Amount paid" },
    { token: "{{3}}", meaning: "The service purchased" }, { token: "{{4}}", meaning: "Your salon's name" },
  ],
  product_purchased: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Amount paid" },
    { token: "{{3}}", meaning: "The product purchased" }, { token: "{{4}}", meaning: "Your salon's name" },
  ],
  package_purchased: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Package name" },
    { token: "{{3}}", meaning: "Package value" }, { token: "{{4}}", meaning: "Total sessions" },
    { token: "{{5}}", meaning: "Expiry date" }, { token: "{{6}}", meaning: "Your salon's name" },
  ],
  membership_purchased: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Membership name" },
    { token: "{{3}}", meaning: "Your salon's name" }, { token: "{{4}}", meaning: "Membership price" },
    { token: "{{5}}", meaning: "Available balance" }, { token: "{{6}}", meaning: "Expiry date" },
  ],
  appointment_confirmation: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "Appointment date" }, { token: "{{4}}", meaning: "Appointment time" },
    { token: "{{5}}", meaning: "Service name" }, { token: "{{6}}", meaning: "Staff name" },
  ],
  appointment_rescheduled: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "Old date" }, { token: "{{4}}", meaning: "Old time" },
    { token: "{{5}}", meaning: "New date" }, { token: "{{6}}", meaning: "New time" },
    { token: "{{7}}", meaning: "Service name" }, { token: "{{8}}", meaning: "Staff name" },
  ],
  appointment_cancelled: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "Appointment date" }, { token: "{{4}}", meaning: "Appointment time" },
    { token: "{{5}}", meaning: "Service name" },
  ],
  payment_received: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Amount paid" },
    { token: "{{3}}", meaning: "Service name" }, { token: "{{4}}", meaning: "Appointment date" },
    { token: "{{5}}", meaning: "Appointment time" }, { token: "{{6}}", meaning: "Your salon's name" },
  ],
  package_expiring_7d: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Package name" },
    { token: "{{3}}", meaning: "Expiry date" }, { token: "{{4}}", meaning: "Sessions remaining" },
  ],
  package_expiring_24h: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Package name" },
    { token: "{{3}}", meaning: "Sessions remaining" }, { token: "{{4}}", meaning: "Expiry date" },
  ],
  membership_expiring_7d: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Membership name" },
    { token: "{{3}}", meaning: "Expiry date" }, { token: "{{4}}", meaning: "Balance remaining" },
  ],
  membership_expiring_24h: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Membership name" },
    { token: "{{3}}", meaning: "Balance remaining" }, { token: "{{4}}", meaning: "Expiry date" },
  ],
  package_session_used: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Service redeemed" },
    { token: "{{3}}", meaning: "Package name" }, { token: "{{4}}", meaning: "Sessions remaining" },
    { token: "{{5}}", meaning: "Your salon's name" },
  ],
  membership_session_used: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Service redeemed" },
    { token: "{{3}}", meaning: "Amount used" }, { token: "{{4}}", meaning: "Remaining balance" },
    { token: "{{5}}", meaning: "Your salon's name" },
  ],
  package_appointment_reminder_24h: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "Appointment date" }, { token: "{{4}}", meaning: "Appointment time" },
    { token: "{{5}}", meaning: "Service name" }, { token: "{{6}}", meaning: "Package name" },
  ],
  service_reminder_24h: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "Appointment date" }, { token: "{{4}}", meaning: "Appointment time" },
    { token: "{{5}}", meaning: "Service name" }, { token: "{{6}}", meaning: "Staff name" },
  ],
  reward_points_earned: [
    { token: "{{1}}", meaning: "Customer's name" }, { token: "{{2}}", meaning: "Points earned" },
    { token: "{{3}}", meaning: "Your salon's name" }, { token: "{{4}}", meaning: "Total points balance" },
  ],
  referral_reward: [
    { token: "{{1}}", meaning: "Referrer's name" }, { token: "{{2}}", meaning: "Referred client's name" },
    { token: "{{3}}", meaning: "Your salon's name" }, { token: "{{4}}", meaning: "Reward amount" },
    { token: "{{5}}", meaning: "Total referral balance" },
  ],
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  APPROVED: "success", PENDING: "warning", REJECTED: "danger", DRAFT: "secondary",
};

export default function TriggerTemplatesPanel() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.auth.salonId);
  const { purchaseTemplates, loading } = useAppSelector((s: any) => s.marketing);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [activeCategory, setActiveCategory] = useState<TriggerCategory>("quick_sale");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [infoKey, setInfoKey] = useState<string | null>(null);

  useEffect(() => {
    if (salonId) dispatch(fetchPurchaseTemplatesThunk(salonId));
  }, [dispatch, salonId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const t of purchaseTemplates as PurchaseTemplate[]) {
      // Once a template is live (APPROVED), editing drafts a replacement
      // version instead of touching the live wording — start from whatever's
      // already mid-edit (pending_body_text), falling back to the live text
      // as the starting point for the new version.
      next[t.event_type] = t.status === "APPROVED"
        ? (t.pending_body_text ?? t.body_text ?? "")
        : (t.body_text ?? "");
    }
    setDrafts(next);
  }, [purchaseTemplates]);

  const byEvent = useCallback(
    (eventType: PurchaseEventType) => (purchaseTemplates as PurchaseTemplate[]).find((t) => t.event_type === eventType),
    [purchaseTemplates]
  );

  const handleSave = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSavingKey(eventType);
    try {
      const res = await dispatch(updatePurchaseTemplateThunk({ salonId, eventType, bodyText: drafts[eventType] ?? "" }));
      if (updatePurchaseTemplateThunk.fulfilled.match(res)) showSuccess("Wording saved");
      else showError((res.payload as string) ?? "Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSubmit = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSavingKey(eventType);
    try {
      const res = await dispatch(submitPurchaseTemplateThunk({ salonId, eventType }));
      if (submitPurchaseTemplateThunk.fulfilled.match(res)) showSuccess("Submitted to Meta for approval");
      else showError((res.payload as string) ?? "Failed to submit");
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSavingKey(eventType);
    try {
      const res = await dispatch(resetPurchaseTemplateThunk({ salonId, eventType }));
      if (resetPurchaseTemplateThunk.fulfilled.match(res)) showSuccess("Reset — ready to resubmit");
      else showError((res.payload as string) ?? "Failed to reset");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSync = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSavingKey(eventType);
    try {
      const res = await dispatch(syncPurchaseTemplateThunk({ salonId, eventType }));
      if (syncPurchaseTemplateThunk.fulfilled.match(res)) showSuccess("Status synced from Meta");
      else showError((res.payload as string) ?? "Failed to sync");
    } finally {
      setSavingKey(null);
    }
  };

  const eventsInCategory = (CATEGORY_ORDER as TriggerCategory[]).reduce<Record<TriggerCategory, PurchaseEventType[]>>(
    (acc, cat) => {
      acc[cat] = (Object.keys(EVENT_CATEGORIES) as PurchaseEventType[]).filter((et) => EVENT_CATEGORIES[et].includes(cat));
      return acc;
    },
    { quick_sale: [], calendar: [], other: [] }
  );

  const visibleEvents = eventsInCategory[activeCategory];

  return (
    <div className="tp-panel">
      {overlay}

      <div className="tp-category-row">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            className={`tp-category-btn ${activeCategory === cat ? "tp-category-btn--active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            <i className={`ti ${CATEGORY_META[cat].icon}`} />
            {CATEGORY_META[cat].label}
            <span className="tp-category-count">{eventsInCategory[cat].length}</span>
          </button>
        ))}
      </div>
      <p className="tp-category-desc">{CATEGORY_META[activeCategory].desc}</p>

      {loading.fetchPurchaseTemplates && purchaseTemplates.length === 0 ? (
        <div className="tp-loading">Loading trigger templates...</div>
      ) : (
        <div className="tp-grid">
          {visibleEvents.map((eventType) => {
            const tpl = byEvent(eventType);
            const meta = EVENT_LABELS[eventType];
            const isCaptionOnly = CAPTION_ONLY_EVENTS.includes(eventType);
            const isBusy = savingKey === eventType;
            const status = tpl?.status ?? "DRAFT";
            const isLive = !isCaptionOnly && status === "APPROVED";
            const pendingStatus = tpl?.pending_status ?? null;
            const draftText = drafts[eventType] ?? "";

            return (
              <div key={eventType} className="tp-card">
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
                  <button className="tp-info-btn" onClick={() => setInfoKey(infoKey === eventType ? null : eventType)} title="What do the variables mean?">
                    <Info size={15} />
                  </button>
                </div>

                {infoKey === eventType && (
                  <div className="tp-info-panel">
                    <div className="tp-info-panel-head">
                      Variables
                      <button className="tp-info-close" onClick={() => setInfoKey(null)}><X size={13} /></button>
                    </div>
                    <ul>
                      {VARIABLE_EXPLANATIONS[eventType].map((v) => (
                        <li key={v.token}><code>{v.token}</code> — {v.meaning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isLive && <div className="tp-live-note">Currently sending — editing below drafts a replacement version</div>}

                <Input
                  multiline
                  rows={5}
                  value={draftText}
                  onChange={(e) => setDrafts((d) => ({ ...d, [eventType]: e.target.value }))}
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
                  <Button size="sm" variant="outline-secondary" loading={isBusy} disabled={isBusy} onClick={() => handleSave(eventType)}>
                    Save
                  </Button>

                  {!isCaptionOnly && !isLive && (status === "DRAFT" || status === "REJECTED") && (
                    <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draftText.trim()} onClick={() => handleSubmit(eventType)}>
                      Submit to Meta
                    </Button>
                  )}
                  {!isCaptionOnly && !isLive && status === "PENDING" && (
                    <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={() => handleSync(eventType)}>
                      ↻ Check Status
                    </Button>
                  )}
                  {!isCaptionOnly && !isLive && status === "REJECTED" && (
                    <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={() => handleReset(eventType)}>
                      Reset
                    </Button>
                  )}

                  {!isCaptionOnly && isLive && (pendingStatus === null || pendingStatus === "REJECTED") && (
                    <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draftText.trim()} onClick={() => handleSubmit(eventType)}>
                      Submit Update
                    </Button>
                  )}
                  {!isCaptionOnly && isLive && pendingStatus === "PENDING" && (
                    <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={() => handleSync(eventType)}>
                      ↻ Check Update Status
                    </Button>
                  )}
                  {!isCaptionOnly && isLive && pendingStatus === "REJECTED" && (
                    <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={() => handleReset(eventType)}>
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
