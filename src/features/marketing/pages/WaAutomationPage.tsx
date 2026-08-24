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
import { Button, Input, Badge, PageHeader } from "../../../components/ui";
import type { PurchaseEventType, PurchaseTemplate } from "../../../types/marketing.types";
import "../styles/WaAutomationPage.scss";

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
  // Richer than the generic appointment reminders above — these name the
  // service, staff and package so the message can say the visit is already
  // paid for. Order is fixed by runPackageAppointmentReminders() on the
  // backend; keep the two in step.
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

export default function WaAutomationPage() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s) => s.auth.salonId);
  const { purchaseTemplates, loading } = useAppSelector((s) => s.marketing);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [resettingType, setResettingType] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const [openInfoFor, setOpenInfoFor] = useState<PurchaseEventType | null>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    if (salonId) dispatch(fetchPurchaseTemplatesThunk(salonId));
  }, [dispatch, salonId]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      purchaseTemplates.forEach((t) => {
        if (next[t.event_type] === undefined) next[t.event_type] = t.body_text ?? "";
      });
      return next;
    });
  }, [purchaseTemplates]);

  const syncPending = useCallback(async () => {
    if (!salonId) return;
    const pending = purchaseTemplates.filter((t) => t.status === "PENDING");
    for (const t of pending) {
      const res = await dispatch(syncPurchaseTemplateThunk({ salonId, eventType: t.event_type }));
      if (syncPurchaseTemplateThunk.fulfilled.match(res)) {
        const updated = res.payload;
        if (updated.status === "APPROVED") showSuccess(`✅ "${EVENT_LABELS[updated.event_type].label}" approved by Meta!`);
        else if (updated.status === "REJECTED") showError(`❌ "${EVENT_LABELS[updated.event_type].label}" was rejected by Meta.`);
      }
    }
  }, [salonId, purchaseTemplates, dispatch]);

  useEffect(() => {
    const hasPending = purchaseTemplates.some((t) => t.status === "PENDING");
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

  const hasPending = purchaseTemplates.some((t) => t.status === "PENDING");
  const allDraft = purchaseTemplates.length > 0 && purchaseTemplates.every((t) => t.status === "DRAFT");

  return (
    <div className="wa-auto-page">
      {overlay}
      <PageHeader
        title="Automated Messages"
        subtitle="Automatic WhatsApp messages sent across your customer journey — purchases, appointment reminders, post-visit follow-ups, and expiry alerts. These have their own templates, separate from Campaign Templates, submitted to Meta under your own WhatsApp Business Account, so it's billed to you, not us."
      />

      {allDraft && (
        <div className="wa-auto-banner wa-auto-banner--info">
          None of these are live yet — edit the wording below and submit each one for Meta's approval to turn it on.
          For purchase events, the PDF bill still sends to customers regardless of approval status.
        </div>
      )}

      {hasPending && (
        <div className="wa-auto-banner wa-auto-banner--pending">
          <span className="wa-auto-dot" />
          <span>Auto-checking Meta approval every 60s</span>
          <span>Next check in <strong>{countdown}s</strong></span>
        </div>
      )}

      {loading.fetchPurchaseTemplates ? (
        <div className="wa-auto-loading">Loading templates...</div>
      ) : (
        <div className="wa-auto-grid">
          {purchaseTemplates.map((t: PurchaseTemplate) => {
            const meta = EVENT_LABELS[t.event_type];
            const editable = t.status === "DRAFT" || t.status === "REJECTED";
            const draftValue = drafts[t.event_type] ?? "";
            const unchanged = draftValue === (t.body_text ?? "");

            return (
              <div key={t.event_type} className="wa-auto-card">
                <div className="wa-auto-card-head">
                  <div>
                    <div className="wa-auto-card-label">
                      {meta.label}
                      <button
                        type="button"
                        className="wa-auto-info-btn"
                        aria-label={`What will the customer receive for ${meta.label}?`}
                        onClick={() => setOpenInfoFor((prev) => (prev === t.event_type ? null : t.event_type))}
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <div className="wa-auto-card-hint">{meta.hint}</div>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </div>

                {openInfoFor === t.event_type && (
                  <div className="wa-auto-info-panel">
                    <div className="wa-auto-info-panel-head">
                      <span>What the customer actually receives</span>
                      <button
                        type="button"
                        className="wa-auto-info-close"
                        aria-label="Close"
                        onClick={() => setOpenInfoFor(null)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <p>
                      The wording below is a template — the customer never sees <code>{"{{1}}"}</code>,{" "}
                      <code>{"{{2}}"}</code>, etc. Each one is automatically replaced with real info when the message sends:
                    </p>
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
                  <div className="wa-auto-rejection">Rejected: {t.rejection_reason}</div>
                )}

                <Input
                  multiline
                  rows={4}
                  containerClass="mb-2"
                  disabled={!editable}
                  value={draftValue}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [t.event_type]: e.target.value }))}
                  placeholder="Message wording — {{1}} is customer name, {{2}} is salon name, {{3}} is item name"
                />

                <div className="wa-auto-card-actions">
                  {(t.status === "APPROVED" || t.status === "PENDING") && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      loading={resettingType === t.event_type}
                      onClick={() => handleResetResubmit(t.event_type)}
                    >
                      Reset &amp; Resubmit
                    </Button>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={!editable || unchanged}
                    loading={savingType === t.event_type}
                    onClick={() => handleSave(t.event_type)}
                  >
                    Save Wording
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!editable || !draftValue.trim()}
                    loading={submittingType === t.event_type}
                    onClick={() => handleSubmit(t.event_type)}
                  >
                    {t.status === "REJECTED" ? "Resubmit for Approval" : "Submit for Approval"}
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
