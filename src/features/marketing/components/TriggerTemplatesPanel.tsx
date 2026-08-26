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
  client_welcome:      ["quick_sale", "calendar"],
  bill_receipt:        ["quick_sale", "calendar"],

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

// Every PURCHASE_EVENTS member now goes through Meta template submission —
// bill_receipt included (its PDF is the template's document HEADER). Kept as
// an extensibility point in case a future event opts out again.
const CAPTION_ONLY_EVENTS: PurchaseEventType[] = [];

const EVENT_LABELS: Record<PurchaseEventType, { label: string; hint: string }> = {
  client_welcome:       { label: "New Client Welcome", hint: "Sent right after a new client is added, from Quick Sale or Calendar" },
  bill_receipt:          { label: "Bill Receipt (Thank You + Feedback)", hint: "Sent as a document-header template alongside the bill PDF, right after checkout completes" },
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
// Every event uses the same named-placeholder format ({{customer_name}},
// {{salon_name}}, ...) — for the 19 that go to Meta, the backend converts
// these to Meta's required {{1}}/{{2}}/{{3}}... only at submission time; the
// wording shown/edited here always stays in this named form.
const VARIABLE_EXPLANATIONS: Record<PurchaseEventType, Array<{ token: string; meaning: string }>> = {
  client_welcome: [
    { token: "{{customer_name}}", meaning: "Customer's name" },
    { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  bill_receipt: [
    { token: "{{customer_name}}", meaning: "Customer's name" },
    { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{items}}", meaning: "Itemized bill breakdown, built automatically" },
    { token: "{{feedback_line}}", meaning: "Feedback ask + link (or a fallback line for a walk-in with no appointment), built automatically" },
  ],
  service_purchased: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{amount}}", meaning: "Amount paid" },
    { token: "{{service_name}}", meaning: "The service purchased" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  product_purchased: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{amount}}", meaning: "Amount paid" },
    { token: "{{product_name}}", meaning: "The product purchased" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  package_purchased: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{package_name}}", meaning: "Package name" },
    { token: "{{package_value}}", meaning: "Package value" }, { token: "{{total_sessions}}", meaning: "Total sessions" },
    { token: "{{expiry_date}}", meaning: "Expiry date" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  membership_purchased: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{membership_name}}", meaning: "Membership name" },
    { token: "{{salon_name}}", meaning: "Your salon's name" }, { token: "{{membership_price}}", meaning: "Membership price" },
    { token: "{{membership_balance}}", meaning: "Available balance" }, { token: "{{expiry_date}}", meaning: "Expiry date" },
  ],
  appointment_confirmation: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{appointment_date}}", meaning: "Appointment date" }, { token: "{{appointment_time}}", meaning: "Appointment time" },
    { token: "{{service_name}}", meaning: "Service name" }, { token: "{{staff_name}}", meaning: "Staff name" },
  ],
  appointment_rescheduled: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{old_date}}", meaning: "Old date" }, { token: "{{old_time}}", meaning: "Old time" },
    { token: "{{new_date}}", meaning: "New date" }, { token: "{{new_time}}", meaning: "New time" },
    { token: "{{service_name}}", meaning: "Service name" }, { token: "{{staff_name}}", meaning: "Staff name" },
  ],
  appointment_cancelled: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{appointment_date}}", meaning: "Appointment date" }, { token: "{{appointment_time}}", meaning: "Appointment time" },
    { token: "{{service_name}}", meaning: "Service name" },
  ],
  payment_received: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{amount}}", meaning: "Amount paid" },
    { token: "{{service_name}}", meaning: "Service name" }, { token: "{{appointment_date}}", meaning: "Appointment date" },
    { token: "{{appointment_time}}", meaning: "Appointment time" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  package_expiring_7d: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{package_name}}", meaning: "Package name" },
    { token: "{{expiry_date}}", meaning: "Expiry date" }, { token: "{{remaining_sessions}}", meaning: "Sessions remaining" },
  ],
  package_expiring_24h: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{package_name}}", meaning: "Package name" },
    { token: "{{remaining_sessions}}", meaning: "Sessions remaining" }, { token: "{{expiry_date}}", meaning: "Expiry date" },
  ],
  membership_expiring_7d: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{membership_name}}", meaning: "Membership name" },
    { token: "{{expiry_date}}", meaning: "Expiry date" }, { token: "{{remaining_balance}}", meaning: "Balance remaining" },
  ],
  membership_expiring_24h: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{membership_name}}", meaning: "Membership name" },
    { token: "{{remaining_balance}}", meaning: "Balance remaining" }, { token: "{{expiry_date}}", meaning: "Expiry date" },
  ],
  package_session_used: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{service_name}}", meaning: "Service redeemed" },
    { token: "{{package_name}}", meaning: "Package name" }, { token: "{{remaining_sessions}}", meaning: "Sessions remaining" },
    { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  membership_session_used: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{service_name}}", meaning: "Service redeemed" },
    { token: "{{amount_used}}", meaning: "Amount used" }, { token: "{{remaining_balance}}", meaning: "Remaining balance" },
    { token: "{{salon_name}}", meaning: "Your salon's name" },
  ],
  package_appointment_reminder_24h: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{appointment_date}}", meaning: "Appointment date" }, { token: "{{appointment_time}}", meaning: "Appointment time" },
    { token: "{{service_name}}", meaning: "Service name" }, { token: "{{package_name}}", meaning: "Package name" },
  ],
  service_reminder_24h: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{salon_name}}", meaning: "Your salon's name" },
    { token: "{{appointment_date}}", meaning: "Appointment date" }, { token: "{{appointment_time}}", meaning: "Appointment time" },
    { token: "{{service_name}}", meaning: "Service name" }, { token: "{{staff_name}}", meaning: "Staff name" },
  ],
  reward_points_earned: [
    { token: "{{customer_name}}", meaning: "Customer's name" }, { token: "{{points_earned}}", meaning: "Points earned" },
    { token: "{{salon_name}}", meaning: "Your salon's name" }, { token: "{{total_points}}", meaning: "Total points balance" },
  ],
  referral_reward: [
    { token: "{{customer_name}}", meaning: "Referrer's name" }, { token: "{{referred_customer_name}}", meaning: "Referred client's name" },
    { token: "{{salon_name}}", meaning: "Your salon's name" }, { token: "{{reward}}", meaning: "Reward amount" },
    { token: "{{total_points}}", meaning: "Total referral balance" },
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
