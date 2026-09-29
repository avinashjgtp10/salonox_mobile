import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  fetchPurchaseTemplatesThunk,
  updatePurchaseTemplateThunk,
  submitPurchaseTemplateThunk,
  resetPurchaseTemplateThunk,
  syncPurchaseTemplateThunk,
  sendPurchaseTemplateTestThunk,
  fetchWaAutomationSettingsThunk,
  updateWaAutomationSettingThunk,
} from "../../../middleware/marketing/wa-automation.thunk";
import {
  fetchNotificationChannelTemplatesThunk,
  setChannelEnabledThunk,
} from "../../../middleware/marketing/notification-channels.thunk";
import { Button, Badge } from "../../../components/ui";
import ChannelSmsSection from "./ChannelSmsSection";
import ChannelEmailSection from "./ChannelEmailSection";
import VariableChips from "./VariableChips";
import { renderSamplePreview } from "../utils/sampleValues";
import type { PurchaseEventType, PurchaseTemplate } from "../../../types/marketing.types";
import "../styles/TriggerTemplatesPanel.scss";

// ── Category grouping (display only — purely a left-panel filter) ──────────
type DisplayCategory = "quick_sale" | "calendar" | "membership" | "packages" | "payments" | "other";

const CATEGORY_LABEL: Record<DisplayCategory, string> = {
  quick_sale: "Quick Sale", calendar: "Calendar", membership: "Membership",
  packages: "Packages", payments: "Payments", other: "Other",
};
const CATEGORY_ORDER: DisplayCategory[] = ["quick_sale", "calendar", "membership", "packages", "payments", "other"];

// client_welcome and bill_receipt are shared — they show up under both Quick
// Sale and Calendar (same underlying template either way, edited once).
const EVENT_CATEGORIES: Record<PurchaseEventType, DisplayCategory[]> = {
  client_welcome:      ["quick_sale", "calendar"],
  bill_receipt:        ["quick_sale", "calendar"],
  package_purchased:    ["quick_sale"],
  membership_purchased: ["quick_sale"],
  appointment_confirmation: ["calendar"],
  appointment_rescheduled:  ["calendar"],
  appointment_cancelled:    ["calendar"],
  payment_received:         ["calendar"],
  package_appointment_reminder_24h: ["calendar"],
  service_reminder_24h:             ["calendar"],
  membership_expiring_7d:  ["membership"],
  membership_expiring_24h: ["membership"],
  membership_session_used: ["membership"],
  package_expiring_7d:  ["packages"],
  package_expiring_24h: ["packages"],
  package_session_used: ["packages"],
  ewallet_used:         ["payments"],
  referral_credit_used: ["payments"],
  reward_points_used:   ["payments"],
  reward_points_earned: ["payments"],
  referral_reward:      ["payments"],
  birthday_wishes:      ["other"],
  anniversary_wishes:   ["other"],
  cash_counter_opened:  ["other"],
  cash_counter_closed:  ["other"],
};

const EVENT_ICON: Record<PurchaseEventType, string> = {
  client_welcome: "👤", bill_receipt: "🧾", package_purchased: "📦", membership_purchased: "🎁",
  appointment_confirmation: "📅", appointment_rescheduled: "🔄", appointment_cancelled: "❌", payment_received: "💳",
  package_expiring_7d: "⏰", package_expiring_24h: "⏰", membership_expiring_7d: "⏰", membership_expiring_24h: "⏰",
  package_session_used: "✅", membership_session_used: "✅",
  package_appointment_reminder_24h: "🔔", service_reminder_24h: "🔔",
  reward_points_earned: "⭐", referral_reward: "🤝", ewallet_used: "👛", referral_credit_used: "🤝", reward_points_used: "⭐",
  birthday_wishes: "🎂", anniversary_wishes: "💐", cash_counter_opened: "💰", cash_counter_closed: "💰",
};

const EVENT_LABELS: Record<PurchaseEventType, { label: string; hint: string }> = {
  client_welcome:       { label: "New Client Welcome", hint: "Sent right after a new client is added, from Quick Sale or Calendar — includes the client's own referral code" },
  bill_receipt:          { label: "Bill Receipt (Thank You + Feedback)", hint: "Sent as a document-header template alongside the bill PDF, right after checkout completes — itemizes everything purchased, so it's the only confirmation for a Quick Sale" },
  package_purchased:    { label: "Package Purchased", hint: "Sent only when a package is sold standalone (not as part of a bigger checkout, which already sends Bill Receipt)" },
  membership_purchased: { label: "Membership Purchased", hint: "Sent only when a membership is sold standalone (not as part of a bigger checkout, which already sends Bill Receipt)" },
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
  ewallet_used:         { label: "eWallet Used", hint: "Sent whenever a payment is settled (fully or partly) using eWallet balance" },
  referral_credit_used: { label: "Referral Credit Used", hint: "Sent whenever a payment is settled (fully or partly) using Referral Balance" },
  reward_points_used:   { label: "Reward Points Used", hint: "Sent whenever a payment is settled (fully or partly) using Reward Points" },
  birthday_wishes:      { label: "Birthday Wishes", hint: "Sent automatically on the client's birthday — no manual sending needed" },
  anniversary_wishes:   { label: "Anniversary Wishes", hint: "Sent automatically on the client's anniversary — no manual sending needed" },
  cash_counter_opened:  { label: "Cash Counter Opened", hint: "Sent to the salon owner's WhatsApp number when a staff member opens the cash counter" },
  cash_counter_closed:  { label: "Cash Counter Closed", hint: "Sent to the salon owner's WhatsApp number when the cash counter is closed" },
};

const POLL_INTERVAL = 120_000; // 2 minutes

// "Effective" status — whichever of the two tracks (live status, or an
// in-flight resubmission's pending_status) is actually the one a pending
// check applies to. Used both to decide what to poll and to detect a status
// change worth toasting about.
function effectiveStatus(t: PurchaseTemplate): string {
  return t.status === "APPROVED" && t.pending_status ? t.pending_status : t.status;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  APPROVED: "success", PENDING: "warning", REJECTED: "danger", DRAFT: "secondary",
};

type ChannelTab = "whatsapp" | "sms" | "email";

export default function TriggerTemplatesPanel() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.auth.salonId);
  const { purchaseTemplates, channelTemplates, loading } = useAppSelector((s: any) => s.marketing);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DisplayCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedEvent, setSelectedEvent] = useState<PurchaseEventType | null>(null);
  const [activeTab, setActiveTab] = useState<ChannelTab>("whatsapp");

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const prevStatuses = useRef<Record<string, string>>({});

  const [smsEnabledOpen, setSmsEnabledOpen] = useState(false);
  const [emailEnabledOpen, setEmailEnabledOpen] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testingWa, setTestingWa] = useState(false);

  // WhatsApp's own per-event enabled toggle — the backend treats a MISSING
  // row as enabled, so an event absent from the fetched list defaults to
  // true, not false.
  const [waEnabledByEvent, setWaEnabledByEvent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (salonId) dispatch(fetchPurchaseTemplatesThunk(salonId));
  }, [dispatch, salonId]);

  useEffect(() => {
    if (!salonId) return;
    dispatch(fetchNotificationChannelTemplatesThunk(salonId));
    dispatch(fetchWaAutomationSettingsThunk(salonId)).then((action: any) => {
      if (!fetchWaAutomationSettingsThunk.fulfilled.match(action)) return;
      const next: Record<string, boolean> = {};
      for (const row of action.payload) next[row.event_type] = row.is_active;
      setWaEnabledByEvent(next);
    });
  }, [dispatch, salonId]);

  const smsTplByEvent = useCallback(
    (eventType: PurchaseEventType) => (channelTemplates as any[]).find((t) => t.event_type === eventType && t.channel === "SMS"),
    [channelTemplates]
  );
  const emailTplByEvent = useCallback(
    (eventType: PurchaseEventType) => (channelTemplates as any[]).find((t) => t.event_type === eventType && t.channel === "EMAIL"),
    [channelTemplates]
  );

  const handleToggleWaEnabled = async (eventType: PurchaseEventType, enabled: boolean) => {
    if (!salonId) return;
    setWaEnabledByEvent((prev) => ({ ...prev, [eventType]: enabled })); // optimistic
    const res = await dispatch(updateWaAutomationSettingThunk({ salonId, eventType, isActive: enabled }));
    if (updateWaAutomationSettingThunk.rejected.match(res)) {
      setWaEnabledByEvent((prev) => ({ ...prev, [eventType]: !enabled })); // revert
      showError("Failed to update WhatsApp setting");
    }
  };

  const handleToggleChannelEnabled = async (eventType: PurchaseEventType, channel: "sms" | "email", enabled: boolean) => {
    if (!salonId) return;
    const res = await dispatch(setChannelEnabledThunk({ salonId, eventType, channel, enabled }));
    if (setChannelEnabledThunk.rejected.match(res)) {
      showError((res.payload as string) ?? `Failed to update ${channel.toUpperCase()} setting`);
    }
  };

  useEffect(() => {
    for (const t of purchaseTemplates as PurchaseTemplate[]) {
      if (!prevStatuses.current[t.event_type]) {
        prevStatuses.current[t.event_type] = effectiveStatus(t);
      }
    }
  }, [purchaseTemplates]);

  const syncPending = useCallback(async () => {
    if (!salonId) return;
    const pending = (purchaseTemplates as PurchaseTemplate[]).filter((t) => effectiveStatus(t) === "PENDING");
    if (pending.length === 0) return;
    for (const t of pending) {
      const res = await dispatch(syncPurchaseTemplateThunk({ salonId, eventType: t.event_type }));
      if (syncPurchaseTemplateThunk.fulfilled.match(res)) {
        const updated = res.payload;
        const next = effectiveStatus(updated);
        const prev = prevStatuses.current[t.event_type];
        if (prev && prev !== next) {
          const label = EVENT_LABELS[t.event_type]?.label ?? t.event_type;
          if (next === "APPROVED") showSuccess(`"${label}" approved by Meta!`);
          else if (next === "REJECTED") showError(`"${label}" was rejected by Meta.`);
        }
        prevStatuses.current[t.event_type] = next;
      }
    }
  }, [salonId, purchaseTemplates, dispatch, showSuccess, showError]);

  const hasPending = (purchaseTemplates as PurchaseTemplate[]).some((t) => effectiveStatus(t) === "PENDING");

  useEffect(() => {
    if (!hasPending) { setCountdown(POLL_INTERVAL / 1000); return; }
    setCountdown(POLL_INTERVAL / 1000);
    const ticker = setInterval(() => setCountdown((prev) => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1)), 1000);
    const poller = setInterval(() => { syncPending(); setCountdown(POLL_INTERVAL / 1000); }, POLL_INTERVAL);
    return () => { clearInterval(ticker); clearInterval(poller); };
  }, [hasPending, syncPending]);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await syncPending();
    } finally {
      setIsSyncingAll(false);
    }
  };

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

  const allEvents = Object.keys(EVENT_CATEGORIES) as PurchaseEventType[];

  // Default to the first event once data is available.
  useEffect(() => {
    if (!selectedEvent && allEvents.length > 0) setSelectedEvent(allEvents[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseTemplates.length]);

  useEffect(() => {
    setActiveTab("whatsapp");
    setTestPhone("");
  }, [selectedEvent]);

  const visibleEvents = useMemo(() => {
    return allEvents.filter((et) => {
      if (categoryFilter !== "all" && !EVENT_CATEGORIES[et].includes(categoryFilter)) return false;
      if (search.trim() && !EVENT_LABELS[et].label.toLowerCase().includes(search.trim().toLowerCase())) return false;
      const active = waEnabledByEvent[et] ?? true;
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, categoryFilter, search, statusFilter, waEnabledByEvent]);

  const categoryCounts = useMemo(() => {
    const counts: Record<DisplayCategory, number> = { quick_sale: 0, calendar: 0, membership: 0, packages: 0, payments: 0, other: 0 };
    for (const et of allEvents) for (const cat of EVENT_CATEGORIES[et]) counts[cat]++;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Submit always saves whatever's currently in the textarea first — a
      // salon shouldn't need a separate Save click before Submit for it to
      // pick up their latest edit.
      const saveRes = await dispatch(updatePurchaseTemplateThunk({ salonId, eventType, bodyText: drafts[eventType] ?? "" }));
      if (!updatePurchaseTemplateThunk.fulfilled.match(saveRes)) {
        showError((saveRes.payload as string) ?? "Failed to save wording");
        return;
      }
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

  const handleSendWaTest = async (eventType: PurchaseEventType) => {
    if (!salonId || !testPhone.trim()) return;
    setTestingWa(true);
    try {
      const res = await dispatch(sendPurchaseTemplateTestThunk({ salonId, eventType, phone: testPhone.trim() }));
      if (sendPurchaseTemplateTestThunk.fulfilled.match(res)) {
        if (res.payload.sent) showSuccess("Test message sent");
        else if (res.payload.status === "IN_PROGRESS") showSuccess("Test message queued — it'll arrive shortly");
        else showError(res.payload.failure_reason || "Test message failed to send");
      } else {
        showError((res.payload as string) ?? "Failed to send test message");
      }
    } finally {
      setTestingWa(false);
    }
  };

  const insertToken = (eventType: PurchaseEventType, token: string) => {
    setDrafts((d) => ({ ...d, [eventType]: (d[eventType] ?? "") + `{{${token}}}` }));
  };

  // ── Selected event's derived data ─────────────────────────────────────────
  const tpl = selectedEvent ? byEvent(selectedEvent) : undefined;
  const status = tpl ? effectiveStatus(tpl) : "DRAFT";
  const isLive = !!tpl && tpl.status === "APPROVED";
  const draft = selectedEvent ? drafts[selectedEvent] ?? "" : "";
  const isBusy = selectedEvent === savingKey;
  const smsTpl = selectedEvent ? smsTplByEvent(selectedEvent) : undefined;
  const emailTpl = selectedEvent ? emailTplByEvent(selectedEvent) : undefined;
  const previewText = renderSamplePreview(draft);

  return (
    <div className="tp-panel">
      {overlay}

      {hasPending && (
        <div className="tp-autopoll-banner">
          <span className="tp-dot" />
          <span className="tp-autopoll-text">Auto-checking Meta approval every 2 min</span>
          <span className="tp-autopoll-countdown">Next check in <strong>{countdown}s</strong></span>
          <Button variant="outline-warning" size="sm" loading={isSyncingAll} disabled={isSyncingAll} onClick={handleSyncAll}>
            ↻ Check Now
          </Button>
        </div>
      )}

      {loading.fetchPurchaseTemplates && purchaseTemplates.length === 0 ? (
        <div className="tp-loading">Loading trigger templates...</div>
      ) : (
        <div className="tp-layout">

          {/* ── Left: event list ── */}
          <div className="tp-list-col">
            <div className="tp-list-toolbar">
              <input
                className="tp-search"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="tp-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">Active (All)</option>
                <option value="active">Active only</option>
                <option value="inactive">Stopped only</option>
              </select>
            </div>

            <div className="tp-category-tabs">
              <button className={`tp-cat-tab${categoryFilter === "all" ? " tp-cat-tab--active" : ""}`} onClick={() => setCategoryFilter("all")}>
                All <span className="tp-cat-tab-count">{allEvents.length}</span>
              </button>
              {CATEGORY_ORDER.map((cat) => (
                <button key={cat} className={`tp-cat-tab${categoryFilter === cat ? " tp-cat-tab--active" : ""}`} onClick={() => setCategoryFilter(cat)}>
                  {CATEGORY_LABEL[cat]} <span className="tp-cat-tab-count">{categoryCounts[cat]}</span>
                </button>
              ))}
            </div>

            <div className="tp-event-list">
              {visibleEvents.map((eventType) => {
                const t = byEvent(eventType);
                const st = t ? effectiveStatus(t) : "DRAFT";
                const preview = (t?.status === "APPROVED" ? t?.pending_body_text ?? t?.body_text : t?.body_text) ?? "";
                const active = waEnabledByEvent[eventType] ?? true;
                return (
                  <button
                    key={eventType}
                    className={`tp-event-row${selectedEvent === eventType ? " tp-event-row--active" : ""}`}
                    onClick={() => setSelectedEvent(eventType)}
                  >
                    <span className="tp-event-icon">{EVENT_ICON[eventType]}</span>
                    <span className="tp-event-info">
                      <span className="tp-event-name">{EVENT_LABELS[eventType].label}</span>
                      <span className="tp-event-preview">{preview || "Not written yet"}</span>
                    </span>
                    <Badge variant={STATUS_VARIANT[st] ?? "secondary"} pill>{st}</Badge>
                    <label className="tp-active-toggle" onClick={(e) => e.stopPropagation()} title={active ? "Sending — click to stop" : "Stopped — click to resume"}>
                      <input type="checkbox" checked={active} onChange={(e) => handleToggleWaEnabled(eventType, e.target.checked)} />
                      <span className="tp-active-toggle-track"><span className="tp-active-toggle-thumb" /></span>
                    </label>
                    <span className="tp-event-chevron">›</span>
                  </button>
                );
              })}
              {visibleEvents.length === 0 && <div className="tp-list-empty">No messages match your filters.</div>}
            </div>
          </div>

          {/* ── Middle + Right: selected event detail ── */}
          {!selectedEvent || !tpl ? (
            <div className="tp-detail-empty">Select a message on the left to view and edit it.</div>
          ) : (
            <>
              <div className="tp-detail-col">
                <div className="tp-detail-header">
                  <span className="tp-detail-icon">{EVENT_ICON[selectedEvent]}</span>
                  <div className="tp-detail-heading">
                    <div className="tp-detail-name">{EVENT_LABELS[selectedEvent].label}</div>
                    <div className="tp-detail-hint">{EVENT_LABELS[selectedEvent].hint}</div>
                  </div>
                  <Badge variant={STATUS_VARIANT[status] ?? "secondary"} pill>{status}</Badge>
                </div>

                {isLive && (
                  <div className="tp-live-note">Currently sending — editing below drafts a replacement version, submitted only when you choose to.</div>
                )}
                {!isLive && tpl.status === "REJECTED" && tpl.rejection_reason && (
                  <div className="tp-rejection">Rejected by Meta: {tpl.rejection_reason}</div>
                )}
                {isLive && tpl.pending_status === "REJECTED" && tpl.pending_rejection_reason && (
                  <div className="tp-rejection">Update rejected by Meta: {tpl.pending_rejection_reason}</div>
                )}

                <div className="tp-content-card">
                  <div className="tp-content-title">Message Content</div>

                  <div className="tp-channel-tabs">
                    <button className={`tp-channel-tab${activeTab === "whatsapp" ? " tp-channel-tab--active tp-channel-tab--whatsapp" : ""}`} onClick={() => setActiveTab("whatsapp")}>
                      💬 WhatsApp
                    </button>
                    <button className={`tp-channel-tab${activeTab === "sms" ? " tp-channel-tab--active" : ""}`} onClick={() => setActiveTab("sms")}>
                      SMS
                    </button>
                    <button className={`tp-channel-tab${activeTab === "email" ? " tp-channel-tab--active" : ""}`} onClick={() => setActiveTab("email")}>
                      Email
                    </button>
                  </div>

                  {activeTab === "whatsapp" && (
                    <>
                      <textarea
                        className="tp-textarea"
                        rows={9}
                        value={draft}
                        placeholder="Message wording..."
                        onChange={(e) => setDrafts((d) => ({ ...d, [selectedEvent]: e.target.value }))}
                      />
                      <div className="tp-char-count">
                        <span>Variables (click to add)</span>
                        <span>{draft.length}/1000</span>
                      </div>
                      <VariableChips eventType={selectedEvent} onInsert={(token) => insertToken(selectedEvent, token)} />

                      <div className="tp-content-actions">
                        <Button size="sm" variant="dark" loading={isBusy} disabled={isBusy} onClick={() => handleSave(selectedEvent)}>
                          💾 Save Changes
                        </Button>
                        <Button size="sm" variant="outline-secondary" disabled={isBusy} onClick={() => setDrafts((d) => ({ ...d, [selectedEvent]: tpl.body_text ?? "" }))}>
                          ⟲ Reset
                        </Button>

                        {!isLive && (status === "DRAFT" || status === "REJECTED") && (
                          <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draft.trim()} onClick={() => handleSubmit(selectedEvent)}>
                            Submit to Meta
                          </Button>
                        )}
                        {!isLive && status === "PENDING" && (
                          <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={() => handleSync(selectedEvent)}>
                            ↻ Check Status
                          </Button>
                        )}
                        {!isLive && status === "REJECTED" && (
                          <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={() => handleReset(selectedEvent)}>
                            Reset Submission
                          </Button>
                        )}
                        {isLive && (tpl.pending_status === null || tpl.pending_status === "REJECTED") && (
                          <Button size="sm" variant="primary" loading={isBusy} disabled={isBusy || !draft.trim()} onClick={() => handleSubmit(selectedEvent)}>
                            Submit Update
                          </Button>
                        )}
                        {isLive && tpl.pending_status === "PENDING" && (
                          <Button size="sm" variant="outline-warning" loading={isBusy} disabled={isBusy} onClick={() => handleSync(selectedEvent)}>
                            ↻ Check Update Status
                          </Button>
                        )}
                        {isLive && tpl.pending_status === "REJECTED" && (
                          <Button size="sm" variant="outline-danger" loading={isBusy} disabled={isBusy} onClick={() => handleReset(selectedEvent)}>
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === "sms" && (
                    <>
                      <label className="tp-channel-enable">
                        <input type="checkbox" checked={smsEnabledOpen || (smsTpl?.enabled ?? false)} onChange={(e) => { setSmsEnabledOpen(e.target.checked); handleToggleChannelEnabled(selectedEvent, "sms", e.target.checked); }} />
                        Send via SMS for this event
                      </label>
                      {(smsEnabledOpen || smsTpl?.enabled) && (
                        <ChannelSmsSection salonId={salonId} eventType={selectedEvent} tpl={smsTpl} />
                      )}
                    </>
                  )}

                  {activeTab === "email" && (
                    <>
                      <label className="tp-channel-enable">
                        <input type="checkbox" checked={emailEnabledOpen || (emailTpl?.enabled ?? false)} onChange={(e) => { setEmailEnabledOpen(e.target.checked); handleToggleChannelEnabled(selectedEvent, "email", e.target.checked); }} />
                        Send via Email for this event
                      </label>
                      {(emailEnabledOpen || emailTpl?.enabled) && (
                        <ChannelEmailSection salonId={salonId} eventType={selectedEvent} tpl={emailTpl} />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Right: Preview ── */}
              {activeTab === "whatsapp" && (
                <div className="tp-preview-col">
                  <div className="tp-preview-title">Preview</div>

                  <div className="tp-preview-phone">
                    <div className="tp-preview-phone-bar">
                      <div className="tp-preview-phone-avatar">S</div>
                      <div>
                        <div className="tp-preview-phone-name">Salon Bot</div>
                        <div className="tp-preview-phone-status">online</div>
                      </div>
                    </div>
                    <div className="tp-preview-phone-body">
                      <div className="tp-preview-bubble">
                        <p className="tp-preview-bubble-text">{previewText || "—"}</p>
                        <div className="tp-preview-bubble-time">
                          {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tp-test-card">
                    <div className="tp-test-title">Test Message</div>
                    <input
                      className="tp-test-input"
                      type="tel"
                      placeholder="Enter phone number"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="dark"
                      fullWidth
                      loading={testingWa}
                      disabled={testingWa || !testPhone.trim() || !isLive}
                      title={!isLive ? "Template must be approved by Meta before sending a test" : undefined}
                      onClick={() => handleSendWaTest(selectedEvent)}
                    >
                      ✈ Send Test
                    </Button>
                    {!isLive && <div className="tp-test-hint">Approve this template with Meta to enable test sends.</div>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
