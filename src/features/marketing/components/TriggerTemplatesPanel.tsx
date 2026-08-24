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
// Quick Sale and Calendar are settled — they group cleanly by what actually
// fires them (a walk-in checkout vs. a scheduled booking's lifecycle).
// "Other" is a PLACEHOLDER grouping for whatever's left over (post-visit
// follow-ups + lifecycle/expiry alerts) — the user explicitly said this
// grouping is wrong and will clarify what "Other" should actually mean.
// Easy to re-slot events into a 4th category later; nothing below depends
// on this grouping being final.
type TriggerCategory = "quick_sale" | "calendar" | "other";

const CATEGORY_META: Record<TriggerCategory, { label: string; icon: string; desc: string }> = {
  quick_sale: {
    label: "Quick Sale",
    icon:  "ti-shopping-cart",
    desc:  "Fires when something is sold at checkout — service, product, membership or package",
  },
  calendar: {
    label: "Calendar",
    icon:  "ti-calendar-event",
    desc:  "Fires around a scheduled booking — confirmation, reminders, reschedules",
  },
  other: {
    label: "Other",
    icon:  "ti-dots-circle-horizontal",
    // Deliberately calls out its own uncertainty in the UI, not just a code
    // comment — a salon owner shouldn't be misled into thinking this
    // grouping is settled when it isn't.
    desc:  "Placeholder grouping — post-visit follow-ups and lifecycle/expiry alerts, pending confirmation",
  },
};

const EVENT_CATEGORY: Record<PurchaseEventType, TriggerCategory> = {
  service_purchased:    "quick_sale",
  product_purchased:    "quick_sale",
  membership_purchased: "quick_sale",
  package_purchased:    "quick_sale",

  appointment_confirmation:        "calendar",
  appointment_reminder_24h:        "calendar",
  appointment_reminder_1h:         "calendar",
  appointment_rescheduled:         "calendar",
  package_appointment_reminder_2d: "calendar",
  package_appointment_reminder_1d: "calendar",

  thank_you:            "other",
  review_request:       "other",
  package_expiring_soon: "other",
  sessions_remaining:    "other",
};

const CATEGORY_ORDER: TriggerCategory[] = ["quick_sale", "calendar", "other"];

const EVENT_LABELS: Record<PurchaseEventType, { label: string; hint: string }> = {
  service_purchased: { label: "Service Purchased", hint: "Sent when a customer pays for a service" },
  product_purchased: { label: "Product Purchased", hint: "Sent when a customer buys a retail product" },
  membership_purchased: { label: "Membership Purchased", hint: "Sent when a customer buys a membership" },
  package_purchased: { label: "Package Purchased", hint: "Sent when a customer buys a service package" },
  appointment_reminder_1h: { label: "Appointment Reminder (1 Hour Before)", hint: "Sent 1 hour before a booked appointment, in addition to the 24h reminder" },
  thank_you: { label: "Thank You", hint: "Sent right after an appointment is marked completed" },
  review_request: { label: "Review Request", hint: "Sent right after an appointment is marked completed, asking for a review" },
  package_expiring_soon: { label: "Package Expiring (7 Days)", hint: "Sent 7 days before a client's package expires" },
  sessions_remaining: { label: "Sessions Remaining", hint: "Sent once when a package or membership has 2 or fewer sessions left" },
  appointment_confirmation: { label: "Appointment Confirmation", hint: "Sent right after a new appointment is booked" },
  appointment_reminder_24h: { label: "Appointment Reminder (24 Hours Before)", hint: "Sent 24 hours before a booked appointment" },
  appointment_rescheduled: { label: "Appointment Rescheduled", hint: "Sent when an appointment's date, time, or staff changes" },
  package_appointment_reminder_2d: { label: "Package Appointment Reminder (2 Days Before)", hint: "Sent 2 days before an appointment booked from a package sale. These appointments don't get the generic reminders above, so they're never messaged twice" },
  package_appointment_reminder_1d: { label: "Package Appointment Reminder (1 Day Before)", hint: "Sent 1 day before an appointment booked from a package sale" },
};

// What each {{n}} placeholder actually turns into in the message the customer
// receives — salon owners edit the wording but don't know what these mean
// otherwise, since {{1}}/{{2}}/{{3}} are Meta's raw template variable syntax.
const VARIABLE_EXPLANATIONS: Record<PurchaseEventType, Array<{ token: string; meaning: string }>> = {
  service_purchased: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The service they purchased" },
  ],
  product_purchased: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The product they purchased" },
  ],
  membership_purchased: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The membership plan name" },
  ],
  package_purchased: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The package name" },
  ],
  appointment_reminder_1h: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The appointment time" },
  ],
  thank_you: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
  ],
  review_request: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
  ],
  package_expiring_soon: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "The package name" },
    { token: "{{3}}", meaning: "The expiry date" },
  ],
  sessions_remaining: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "The package or membership name" },
    { token: "{{3}}", meaning: "How many sessions are left" },
  ],
  appointment_confirmation: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The service booked" },
    { token: "{{4}}", meaning: "The appointment date" },
    { token: "{{5}}", meaning: "The appointment time" },
  ],
  appointment_reminder_24h: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The appointment date" },
    { token: "{{4}}", meaning: "The appointment time" },
  ],
  appointment_rescheduled: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The new appointment date" },
    { token: "{{4}}", meaning: "The new appointment time" },
  ],
  package_appointment_reminder_2d: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The service being booked" },
    { token: "{{4}}", meaning: "The appointment date" },
    { token: "{{5}}", meaning: "The appointment time" },
    { token: "{{6}}", meaning: "The staff member assigned" },
    { token: "{{7}}", meaning: "The package the service is part of" },
  ],
  package_appointment_reminder_1d: [
    { token: "{{1}}", meaning: "Customer's name" },
    { token: "{{2}}", meaning: "Your salon's name" },
    { token: "{{3}}", meaning: "The service being booked" },
    { token: "{{4}}", meaning: "The appointment date" },
    { token: "{{5}}", meaning: "The appointment time" },
    { token: "{{6}}", meaning: "The staff member assigned" },
    { token: "{{7}}", meaning: "The package the service is part of" },
  ],
};

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "danger"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const POLL_INTERVAL = 60_000;

export default function TriggerTemplatesPanel() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.auth.salonId);
  const { purchaseTemplates, loading } = useAppSelector((s: any) => s.marketing);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [resettingType, setResettingType] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const [openInfoFor, setOpenInfoFor] = useState<PurchaseEventType | null>(null);
  const [activeCategory, setActiveCategory] = useState<TriggerCategory>("quick_sale");
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    if (salonId) dispatch(fetchPurchaseTemplatesThunk(salonId));
  }, [dispatch, salonId]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      purchaseTemplates.forEach((t: PurchaseTemplate) => {
        if (next[t.event_type] === undefined) next[t.event_type] = t.body_text ?? "";
      });
      return next;
    });
  }, [purchaseTemplates]);

  const syncPending = useCallback(async () => {
    if (!salonId) return;
    const pending = purchaseTemplates.filter((t: PurchaseTemplate) => t.status === "PENDING");
    for (const t of pending) {
      const res = await dispatch(syncPurchaseTemplateThunk({ salonId, eventType: t.event_type }));
      if (syncPurchaseTemplateThunk.fulfilled.match(res)) {
        const updated = res.payload;
        const prevStatus = t.status;
        if (prevStatus !== updated.status) {
          if (updated.status === "APPROVED") showSuccess(`✅ "${EVENT_LABELS[updated.event_type].label}" approved by Meta!`);
          else if (updated.status === "REJECTED") showError(`❌ "${EVENT_LABELS[updated.event_type].label}" was rejected by Meta.`);
        }
      }
    }
  }, [salonId, purchaseTemplates, dispatch]);

  useEffect(() => {
    const hasPending = purchaseTemplates.some((t: PurchaseTemplate) => t.status === "PENDING");
    if (!hasPending) { setCountdown(POLL_INTERVAL / 1000); return; }
    setCountdown(POLL_INTERVAL / 1000);
    const ticker = setInterval(() => setCountdown((prev) => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1)), 1000);
    const poller = setInterval(() => { syncPending(); setCountdown(POLL_INTERVAL / 1000); }, POLL_INTERVAL);
    return () => { clearInterval(ticker); clearInterval(poller); };
  }, [syncPending, purchaseTemplates]);

  const handleSave = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSavingType(eventType);
    try {
      const res = await dispatch(updatePurchaseTemplateThunk({ salonId, eventType, bodyText: drafts[eventType] ?? "" }));
      if (updatePurchaseTemplateThunk.fulfilled.match(res)) showSuccess("Wording saved");
      else showError((res.payload as string) ?? "Failed to save wording");
    } finally {
      setSavingType(null);
    }
  };

  const handleSubmit = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setSubmittingType(eventType);
    try {
      const res = await dispatch(submitPurchaseTemplateThunk({ salonId, eventType }));
      if (submitPurchaseTemplateThunk.fulfilled.match(res)) {
        showSuccess("Submitted to Meta for approval — this can take anywhere from a few hours to a couple of days.");
      } else {
        showError((res.payload as string) ?? "Failed to submit for approval");
      }
    } finally {
      setSubmittingType(null);
    }
  };

  // Reset & Resubmit: for a template whose Meta copy was deleted (or is stuck
  // APPROVED/PENDING) — reset it to DRAFT, then immediately resubmit with a
  // fresh name in one click. Preserves the salon's current wording.
  const handleResetResubmit = async (eventType: PurchaseEventType) => {
    if (!salonId) return;
    setResettingType(eventType);
    try {
      const resetRes = await dispatch(resetPurchaseTemplateThunk({ salonId, eventType }));
      if (!resetPurchaseTemplateThunk.fulfilled.match(resetRes)) {
        showError((resetRes.payload as string) ?? "Failed to reset template");
        return;
      }
      const res = await dispatch(submitPurchaseTemplateThunk({ salonId, eventType }));
      if (submitPurchaseTemplateThunk.fulfilled.match(res)) {
        showSuccess("Resubmitted to Meta for approval with a fresh template name.");
      } else {
        showError((res.payload as string) ?? "Reset succeeded but resubmission failed — use Submit for Approval.");
      }
    } finally {
      setResettingType(null);
    }
  };

  const hasPending = purchaseTemplates.some((t: PurchaseTemplate) => t.status === "PENDING");
  const allDraft = purchaseTemplates.length > 0 && purchaseTemplates.every((t: PurchaseTemplate) => t.status === "DRAFT");

  const templatesByCategory = (cat: TriggerCategory) =>
    purchaseTemplates.filter((t: PurchaseTemplate) => EVENT_CATEGORY[t.event_type] === cat);

  return (
    <div className="tp-panel">
      {overlay}

      {allDraft && (
        <div className="tp-banner tp-banner--info">
          None of these are live yet — submit each one for Meta's approval to turn it on.
        </div>
      )}

      {hasPending && (
        <div className="tp-banner tp-banner--pending">
          <span className="tp-dot" />
          <span>Auto-checking every 60s</span>
          <span>Next in <strong>{countdown}s</strong></span>
        </div>
      )}

      {/* Category switcher */}
      <div className="tp-category-row">
        {CATEGORY_ORDER.map((cat) => {
          const count = templatesByCategory(cat).length;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              className={`tp-category-btn${activeCategory === cat ? " tp-category-btn--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              <i className={`ti ${meta.icon}`} aria-hidden="true" />
              <span>{meta.label}</span>
              {count > 0 && <span className="tp-category-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <p className="tp-category-desc">
        {CATEGORY_META[activeCategory].desc}
        {activeCategory === "other" && (
          <span className="tp-category-beta"> · provisional</span>
        )}
      </p>

      {loading.fetchPurchaseTemplates ? (
        <div className="tp-loading">Loading templates...</div>
      ) : (
        <div className="tp-grid">
          {templatesByCategory(activeCategory).map((t: PurchaseTemplate) => {
            const meta = EVENT_LABELS[t.event_type];
            const editable = t.status === "DRAFT" || t.status === "REJECTED";
            const draftValue = drafts[t.event_type] ?? "";
            const unchanged = draftValue === (t.body_text ?? "");

            return (
              <div key={t.event_type} className="tp-card">
                <div className="tp-card-head">
                  <div>
                    <div className="tp-card-label">
                      {meta.label}
                      <button
                        type="button"
                        className="tp-info-btn"
                        aria-label={`What will the customer receive for ${meta.label}?`}
                        onClick={() => setOpenInfoFor((prev) => (prev === t.event_type ? null : t.event_type))}
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <div className="tp-card-hint">{meta.hint}</div>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </div>

                {openInfoFor === t.event_type && (
                  <div className="tp-info-panel">
                    <div className="tp-info-panel-head">
                      <span>What the customer receives</span>
                      <button
                        type="button"
                        className="tp-info-close"
                        aria-label="Close"
                        onClick={() => setOpenInfoFor(null)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <p>Each token is replaced with real info when the message sends:</p>
                    <ul>
                      {VARIABLE_EXPLANATIONS[t.event_type].map((v) => (
                        <li key={v.token}>
                          <code>{v.token}</code> → {v.meaning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.status === "REJECTED" && t.rejection_reason && (
                  <div className="tp-rejection">Rejected: {t.rejection_reason}</div>
                )}

                <Input
                  multiline
                  rows={3}
                  containerClass="mb-2"
                  disabled={!editable}
                  value={draftValue}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [t.event_type]: e.target.value }))}
                  placeholder="Message wording — {{1}} is customer name, {{2}} is salon name"
                />

                <div className="tp-card-actions">
                  {(t.status === "APPROVED" || t.status === "PENDING") && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      loading={resettingType === t.event_type}
                      onClick={() => handleResetResubmit(t.event_type)}
                    >
                      Reset
                    </Button>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={!editable || unchanged}
                    loading={savingType === t.event_type}
                    onClick={() => handleSave(t.event_type)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!editable || !draftValue.trim()}
                    loading={submittingType === t.event_type}
                    onClick={() => handleSubmit(t.event_type)}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
