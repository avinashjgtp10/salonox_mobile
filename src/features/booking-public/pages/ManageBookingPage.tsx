import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, TelephoneFill, CalendarCheck, XCircle, ChevronRight,
  ExclamationCircleFill, CheckLg,
} from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ONLINE_BOOKING } from "../../../services/api/endpoints";
import {
  fetchManagedBookingThunk,
  cancelManagedBookingThunk,
  rescheduleManagedBookingThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  DAYS, MONTHS, fmtPrice, salonDateStr, toSalonInstant,
} from "../../online-booking/components/BookingFlow/shared";
import CalendarPicker from "../components/CalendarPicker";
import { useDisplayFont } from "../useDisplayFont";
import "../styles/PublicBooking.scss";

// Predefined reasons from the cancellation spec, plus a free-text fallback.
const CANCEL_REASONS = [
  "Change of plans",
  "Personal reason",
  "Found another time",
  "Unable to attend",
  "Other",
] as const;

function shortBookingId(id?: string | null): string {
  if (!id) return "—";
  return `#BK${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function ManageBookingPage() {
  const { slug, appointmentId } = useParams<{ slug: string; appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const dispatch = useAppDispatch();

  useDisplayFont();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [selDate, setSelDate] = useState<Date>(new Date());
  const [selTime, setSelTime] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [reasonNote, setReasonNote] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [slots, setSlots] = useState<{ morning: string[]; afternoon: string[] }>({ morning: [], afternoon: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!appointmentId || !token) {
      setLoadError("This booking link is invalid.");
      setLoading(false);
      return;
    }
    dispatch(fetchManagedBookingThunk({ appointmentId, token }))
      .unwrap()
      .then((res) => setBooking(res))
      .catch((err) => setLoadError(err || "This booking link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [appointmentId, token, dispatch]);

  // Scrolls the page root, not the window — index.css pins body to
  // `overflow: hidden`, so window.scrollTo does nothing here.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [mode]);

  useEffect(() => {
    if (mode !== "reschedule" || !booking?.salon_id) return;
    let cancelled = false;
    setSlotsLoading(true);
    api.get(ONLINE_BOOKING.AVAILABILITY(String(booking.salon_id)), {
      params: {
        date: salonDateStr(selDate),
        durationMinutes: booking.duration_minutes,
        ...(booking.staff_id ? { staffId: booking.staff_id } : {}),
      },
    })
      .then((res) => {
        if (cancelled) return;
        const all: string[] = res.data?.data?.slots ?? [];
        setSlots({ morning: all.filter((t) => t.endsWith("AM")), afternoon: all.filter((t) => t.endsWith("PM")) });
      })
      .catch(() => { if (!cancelled) setSlots({ morning: [], afternoon: [] }); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [mode, booking?.salon_id, booking?.duration_minutes, booking?.staff_id, selDate]);

  async function handleCancel() {
    if (!appointmentId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // "Other" on its own says nothing useful to the salon, so the free-text
      // note is what's sent in that case.
      const finalReason = reason === "Other" ? reasonNote.trim() : [reason, reasonNote.trim()].filter(Boolean).join(" — ");
      await dispatch(cancelManagedBookingThunk({ appointmentId, token, reason: finalReason || undefined })).unwrap();
      const refreshed = await dispatch(fetchManagedBookingThunk({ appointmentId, token })).unwrap();
      setBooking(refreshed);
      setMode("view");
      toast.success("Booking cancelled.");
    } catch (err: any) {
      setActionError(err || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReschedule() {
    if (!appointmentId || !selTime) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const scheduled_at = toSalonInstant(selDate, selTime);
      await dispatch(rescheduleManagedBookingThunk({ appointmentId, token, scheduled_at })).unwrap();
      // The reschedule endpoint returns the raw appointment row (no staff join),
      // so re-fetch via the managed-booking GET — otherwise staff_name comes
      // back empty and the UI falsely shows "Any available".
      const refreshed = await dispatch(fetchManagedBookingThunk({ appointmentId, token })).unwrap();
      setBooking(refreshed);
      setMode("view");
      setSelTime(null);
      toast.success("Booking rescheduled.");
    } catch (err: any) {
      setActionError(err || "Failed to reschedule booking.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="pb" ref={rootRef}>
        <div className="pb__center"><div className="pb__spinner" /></div>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="pb" ref={rootRef}>
        <div className="pb__center">
          <h2 className="pb__title">Booking not found</h2>
          <p className="pb__subtitle">{loadError || "This booking link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled" || booking.status === "deleted";
  // A finished or missed visit can't be changed by the customer either.
  const isClosed = isCancelled || ["paid", "partial", "no-show"].includes(booking.status);

  const services: any[] = Array.isArray(booking.services) ? booking.services : [];
  const serviceNames = services.map((s) => s.name).filter(Boolean).join(", ") || booking.title || "Appointment";
  const total = services.reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1), 0);
  const currencyCode: string | undefined = booking.salon_currency;

  const dateObj = new Date(booking.scheduled_at);
  const dateLabel = `${DAYS[dateObj.getDay()]}, ${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const timeLabel = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const staffLabel = booking.staff_name || "Any available";
  const salonName = booking.salon_name || "Your salon";
  const salonPhone: string = booking.salon_phone || booking.client_salon_phone || "";

  const statusPill = isCancelled
    ? <span className="pb__pill pb__pill--cancelled">Cancelled</span>
    : booking.status === "paid" || booking.status === "partial"
      ? <span className="pb__pill pb__pill--neutral">Completed</span>
      : booking.status === "no-show"
        ? <span className="pb__pill pb__pill--neutral">No-show</span>
        : <span className="pb__pill">Confirmed</span>;

  const TopBar = ({ onBack }: { onBack?: () => void }) => (
    <div className="pb__topbar">
      {onBack && (
        <button type="button" className="pb__back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
      )}
      <span className="pb__brand">{salonName}</span>
    </div>
  );

  // ── Reschedule ──────────────────────────────────────────────────────────────
  if (mode === "reschedule") {
    return (
      <div className="pb" ref={rootRef}>
        <TopBar onBack={() => { setMode("view"); setSelTime(null); }} />
        <div className="pb__shell pb__shell--wide">
          <div className="pb__heading">
            <h1 className="pb__title">Reschedule Appointment</h1>
            <p className="pb__subtitle">Choose a new date and time.</p>
          </div>

          {actionError && <p className="pb__error">{actionError}</p>}

          <div className="pb__datetime">
            <CalendarPicker
              value={selDate}
              onChange={(d) => { setSelDate(d); setSelTime(null); }}
              maxAdvanceDays={Number(booking.max_advance_days) > 0 ? Number(booking.max_advance_days) : 30}
              allowSameDay={booking.allow_same_day_booking !== false}
            />

            <div className="pb__slots-panel">
              <p className="pb__slots-title">Available Slots</p>
              {slotsLoading ? (
                <p className="pb__empty">Checking availability…</p>
              ) : slots.morning.length === 0 && slots.afternoon.length === 0 ? (
                <p className="pb__empty">No times available on this date. Try another date.</p>
              ) : (
                <>
                  {slots.morning.length > 0 && (
                    <>
                      <p className="pb__slot-group-label">Morning</p>
                      <div className="pb__slots">
                        {slots.morning.map((t) => (
                          <button key={t} type="button" aria-pressed={selTime === t}
                            className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                            onClick={() => setSelTime(t)}>{t}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {slots.afternoon.length > 0 && (
                    <>
                      <p className="pb__slot-group-label">Afternoon &amp; Evening</p>
                      <div className="pb__slots">
                        {slots.afternoon.map((t) => (
                          <button key={t} type="button" aria-pressed={selTime === t}
                            className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                            onClick={() => setSelTime(t)}>{t}</button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="pb__sticky">
            <button type="button" className="pb__btn pb__btn--primary" style={{ width: "100%" }}
              disabled={!selTime || actionLoading} onClick={handleReschedule}>
              {actionLoading ? "Rescheduling…" : "Reschedule"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────
  if (mode === "cancel") {
    return (
      <div className="pb" ref={rootRef}>
        <TopBar onBack={() => setMode("view")} />
        <div className="pb__shell">
          <div className="pb__heading">
            <h1 className="pb__title">Cancel Appointment</h1>
          </div>

          <div className="pb__callout">
            <ExclamationCircleFill size={18} />
            <div>
              <p className="pb__callout-title">Are you sure?</p>
              <p className="pb__callout-text">
                This will cancel your appointment scheduled on {dateLabel} at {timeLabel}.
              </p>
            </div>
          </div>

          {actionError && <p className="pb__error">{actionError}</p>}

          <div className="pb__field">
            <span className="pb__label">Reason for cancellation <span className="pb__optional">(optional)</span></span>
            <div className="pb__list">
              {CANCEL_REASONS.map((r) => (
                <button key={r} type="button" className="pb__row" aria-pressed={reason === r}
                  onClick={() => setReason(reason === r ? "" : r)}>
                  <span className="pb__row-main">
                    <span className="pb__row-title" style={{ fontWeight: 600 }}>{r}</span>
                  </span>
                  <span className={`pb__radio ${reason === r ? "is-on" : ""}`} aria-hidden="true">
                    {reason === r && <span className="pb__radio-dot" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pb__field">
            <label className="pb__label" htmlFor="pb-cancel-note">
              {reason === "Other" ? "Tell us more" : "Anything else?"} <span className="pb__optional">(optional)</span>
            </label>
            <textarea id="pb-cancel-note" className="pb__textarea" rows={3} value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value.slice(0, 500))}
              placeholder="Something came up…" />
          </div>

          <div className="pb__actions">
            <button type="button" className="pb__btn pb__btn--danger"
              disabled={actionLoading} onClick={handleCancel}>
              {actionLoading ? "Cancelling…" : "Yes, Cancel Appointment"}
            </button>
            <button type="button" className="pb__btn pb__btn--ghost"
              disabled={actionLoading} onClick={() => setMode("view")}>
              Keep My Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── View ────────────────────────────────────────────────────────────────────
  return (
    <div className="pb" ref={rootRef}>
      <TopBar />
      <div className="pb__shell">
        <div className="pb__heading">
          <h1 className="pb__title">Manage Your Booking</h1>
          <p className="pb__subtitle">
            {isCancelled
              ? "This appointment has been cancelled."
              : "View, reschedule or cancel your appointment."}
          </p>
        </div>

        {isCancelled && (
          <div className="pb__confirm" style={{ paddingTop: 0 }}>
            <div className="pb__confirm-mark" style={{ background: "#fee2e2", color: "#991b1b" }}>
              <XCircle size={30} />
            </div>
          </div>
        )}

        <div className="pb__summary">
          <dl className="pb__kv">
            <dt>Booking ID</dt>
            <dd>{shortBookingId(booking.id)}</dd>
            <dt>Date &amp; Time</dt>
            <dd>{dateLabel}, {timeLabel}</dd>
            <dt>Services</dt>
            <dd>{serviceNames}</dd>
            <dt>Stylist</dt>
            <dd>{staffLabel}</dd>
            {total > 0 && (<><dt>Amount</dt><dd>{fmtPrice(total, currencyCode)}</dd></>)}
            <dt>Status</dt>
            <dd>{statusPill}</dd>
            {isCancelled && booking.cancel_reason && (
              <><dt>Reason</dt><dd>{booking.cancel_reason}</dd></>
            )}
          </dl>
        </div>

        {!isClosed && (
          <div style={{ marginTop: 18 }}>
            <button type="button" className="pb__action-row" onClick={() => setMode("reschedule")}>
              <CalendarCheck size={17} />
              Reschedule Appointment
              <ChevronRight size={15} />
            </button>
            <button type="button" className="pb__action-row" onClick={() => setMode("cancel")}>
              <XCircle size={17} />
              Cancel Appointment
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {isClosed && !isCancelled && (
          <p className="pb__empty">
            This appointment can no longer be changed online. Please contact the salon if you need help.
          </p>
        )}

        {isCancelled && slug && (
          <div className="pb__actions">
            <a className="pb__btn pb__btn--primary" href={`/book/${slug}`}>
              <CheckLg size={16} /> Book a New Appointment
            </a>
          </div>
        )}

        <div className="pb__help">
          <div>
            <p className="pb__help-title">Need help?</p>
            <p className="pb__help-sub">Contact the salon directly.</p>
          </div>
          {salonPhone && (
            <a className="pb__btn pb__btn--ghost pb__btn--auto" href={`tel:${salonPhone}`}>
              <TelephoneFill size={13} /> Call Salon
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
