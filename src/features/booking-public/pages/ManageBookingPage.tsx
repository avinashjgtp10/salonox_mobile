import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircleFill, XCircleFill, TelephoneFill, PersonFill, CalendarEvent,
  ClockFill, Hash, CalendarX, ChatSquareText, ArrowLeft, CalendarCheck, EnvelopeCheck,
} from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  fetchManagedBookingThunk,
  cancelManagedBookingThunk,
  rescheduleManagedBookingThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  C, GRADIENT, DAYS, MONTHS, fmtDur, fmtPrice, nextDays, buildSlots,
  BackBtn, SectionHead, TimeChip,
} from "../../online-booking/components/BookingFlow/shared";

export default function ManageBookingPage() {
  const { slug, appointmentId } = useParams<{ slug: string; appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"view" | "confirmCancel" | "reschedule">("view");
  const [selDate, setSelDate] = useState<Date>(new Date());
  const [selTime, setSelTime] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const dates = useMemo(() => nextDays(8), []);
  const slots = useMemo(() => buildSlots(selDate), [selDate]);

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

  async function handleCancel() {
    if (!appointmentId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await dispatch(cancelManagedBookingThunk({ appointmentId, token })).unwrap();
      // The cancel endpoint returns the raw appointment row (no staff/client
      // joins), so re-fetch via the managed-booking GET to keep staff_name etc. intact.
      const refreshed = await dispatch(fetchManagedBookingThunk({ appointmentId, token })).unwrap();
      setBooking(refreshed);
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
      const scheduled_at = new Date(`${selDate.toDateString()} ${selTime}`).toISOString();
      await dispatch(
        rescheduleManagedBookingThunk({ appointmentId, token, scheduled_at })
      ).unwrap();
      // The reschedule endpoint returns the raw appointment row (no staff join),
      // so re-fetch via the managed-booking GET — otherwise staff_name comes back
      // empty and the UI falsely shows "Any available" even though the stylist
      // assignment (staff_id) was never touched.
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
      <div className="mbp-loading">
        <div className="mbp-spinner"/>
        <style>{`
          .mbp-loading { display:flex; align-items:center; justify-content:center; min-height:100vh;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${C.light}; }
          .mbp-spinner { width:40px; height:40px; border-radius:50%; border:3px solid ${C.med};
            border-top-color:${C.accent}; animation:mbpSpin 0.7s linear infinite; }
          @keyframes mbpSpin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="mbp-error">
        <h2 className="mbp-error-title">Booking not found</h2>
        <p className="mbp-error-sub">{loadError || "This booking link is invalid or has expired."}</p>
        <style>{`
          .mbp-error { display:flex; flex-direction:column; align-items:center; justify-content:center;
            min-height:100vh; gap:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            padding:24px; text-align:center; background:${C.light}; }
          .mbp-error-title { margin:0; font-size:20px; color:${C.text}; }
          .mbp-error-sub { margin:0; color:${C.muted}; font-size:14px; }
        `}</style>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled" || booking.status === "deleted";
  const services: any[] = Array.isArray(booking.services) ? booking.services : [];
  const title = booking.title || services.map((s) => s.name).join(", ") || "Appointment";
  const total = services.reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1), 0);
  const dateObj = new Date(booking.scheduled_at);
  const dateLabel = `${DAYS[dateObj.getDay()]}, ${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}`;
  const timeLabel = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (isCancelled) {
    const staffLabel = booking.staff_name || "Any available";
    const bookingIdShort = booking.id ? `#${String(booking.id).slice(0, 8).toUpperCase()}` : "—";
    // The cancel endpoint doesn't populate cancelled_at, but it does bump
    // updated_at at the moment of cancellation — use that as the fallback,
    // since nothing else legitimately updates a cancelled booking afterward.
    const cancelledDate = booking.cancelled_at
      ? new Date(booking.cancelled_at)
      : booking.updated_at ? new Date(booking.updated_at) : null;
    const createdDate = booking.created_at ? new Date(booking.created_at) : null;
    const fmtDateShort = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const fmtTimeOf = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const cancelledLabel = cancelledDate ? `${fmtDateShort(cancelledDate)} • ${fmtTimeOf(cancelledDate)}` : null;
    const createdLabel = createdDate ? `${fmtDateShort(createdDate)} • ${fmtTimeOf(createdDate)}` : null;

    const detailRows: { icon: JSX.Element; label: string; value: string }[] = [
      { icon: <PersonFill size={13}/>, label:"Stylist", value: staffLabel },
      { icon: <CalendarEvent size={13}/>, label:"Original Date", value: dateLabel },
      { icon: <ClockFill size={13}/>, label:"Original Time", value: timeLabel },
      { icon: <Hash size={13}/>, label:"Booking ID", value: bookingIdShort },
      ...(booking.client_phone ? [{ icon: <TelephoneFill size={13}/>, label:"Phone Number", value: String(booking.client_phone) }] : []),
      ...(cancelledLabel ? [{ icon: <CalendarX size={13}/>, label:"Cancelled On", value: cancelledLabel }] : []),
      ...(booking.cancel_reason ? [{ icon: <ChatSquareText size={13}/>, label:"Cancellation Reason", value: String(booking.cancel_reason) }] : []),
    ];

    return (
      <div className="cb-page">

        <style>{`
          .cb-page { height:100vh; overflow-y:auto; display:flex; flex-direction:column;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${C.light}; }
          .cb-topbar { width:100%; padding:16px 24px; box-sizing:border-box; background:${C.white}; border-bottom:1px solid ${C.border}; }
          .cb-topbar-inner { max-width:680px; margin:0 auto; }
          .cb-hero { width:100%; padding:56px 24px 44px; box-sizing:border-box;
            background:linear-gradient(135deg, #fef2f2 0%, #fdf2f8 45%, #f8fafc 100%); text-align:center; }
          .cb-hero-inner { max-width:680px; margin:0 auto; display:flex; flex-direction:column; align-items:center; }
          .cb-icon-wrap { position:relative; width:92px; height:92px; margin-bottom:20px; }
          .cb-icon-ring { position:absolute; inset:0; border-radius:50%; border:3px solid #fecaca;
            animation: cbRing 1.6s ease-out infinite; }
          .cb-icon-circle { width:92px; height:92px; border-radius:50%;
            background:linear-gradient(135deg, #ef4444, #b91c1c); display:flex; align-items:center; justify-content:center;
            box-shadow:0 10px 30px rgba(239,68,68,0.35); animation: cbPop 0.5s cubic-bezier(.4,0,.2,1); }
          .cb-status-badge { display:inline-flex; align-items:center; gap:6px; background:#fee2e2; color:#b91c1c;
            font-size:11.5px; font-weight:800; letter-spacing:0.06em; padding:6px 14px; border-radius:999px; margin-bottom:14px; }
          .cb-title { margin:0 0 4px; font-size:26px; font-weight:900; color:${C.text}; }
          .cb-sub { margin:0 0 16px; font-size:14px; color:${C.muted}; font-weight:600; }
          .cb-cancelled-chip { display:inline-flex; align-items:center; gap:6px; background:${C.white}; color:#b91c1c;
            border:1.5px solid #fecaca; font-size:12px; font-weight:700; padding:7px 14px; border-radius:999px; }

          .cb-container { flex:1; width:100%; padding:32px 24px 64px; box-sizing:border-box; }
          .cb-container-inner { max-width:680px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }

          .cb-card { background:rgba(255,255,255,0.75); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
            border:1.5px solid ${C.border}; border-radius:22px; padding:22px 22px 8px; box-shadow:0 8px 32px rgba(46,16,101,0.08);
            animation: cbFadeIn 0.5s cubic-bezier(.4,0,.2,1); }
          .cb-card-title { margin:0 0 14px; font-size:12.5px; font-weight:800; color:${C.text};
            text-transform:uppercase; letter-spacing:0.06em; }
          .cb-detail-row { display:flex; align-items:center; gap:12px; padding:12px 2px; border-bottom:1px solid ${C.border}; }
          .cb-detail-row:last-child { border-bottom:none; }
          .cb-detail-icon { width:34px; height:34px; border-radius:10px; background:${C.light}; color:${C.accent};
            display:flex; align-items:center; justify-content:center; flex-shrink:0; }
          .cb-detail-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
          .cb-detail-label { font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; }
          .cb-detail-value { font-size:13.5px; font-weight:700; color:${C.text}; word-break:break-word; }

          .cb-message-box { display:flex; gap:12px; align-items:flex-start; background:#fef2f2; border:1.5px solid #fecaca;
            border-radius:18px; padding:18px 20px; animation: cbFadeIn 0.55s cubic-bezier(.4,0,.2,1); }
          .cb-message-icon { width:32px; height:32px; border-radius:50%; background:#ef4444; color:${C.white}; flex-shrink:0;
            display:flex; align-items:center; justify-content:center; }
          .cb-message-box p { margin:0; font-size:13px; color:#7f1d1d; line-height:1.55; }
          .cb-message-box p + p { margin-top:6px; }

          .cb-timeline { background:${C.white}; border:1.5px solid ${C.border}; border-radius:18px; padding:20px 22px;
            animation: cbFadeIn 0.6s cubic-bezier(.4,0,.2,1); }
          .cb-timeline-item { display:flex; gap:14px; position:relative; padding-bottom:22px; }
          .cb-timeline-item:last-child { padding-bottom:0; }
          .cb-timeline-item::before { content:''; position:absolute; left:14px; top:30px; bottom:0; width:2px; background:${C.border}; }
          .cb-timeline-item:last-child::before { display:none; }
          .cb-timeline-dot { width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center;
            justify-content:center; z-index:1; }
          .cb-timeline-dot.done { background:#dcfce7; color:#15803d; }
          .cb-timeline-dot.cancelled { background:#fee2e2; color:#b91c1c; }
          .cb-timeline-text { display:flex; flex-direction:column; gap:2px; padding-top:5px; }
          .cb-timeline-label { font-size:13.5px; font-weight:700; color:${C.text}; }
          .cb-timeline-time { font-size:11.5px; color:${C.muted}; }

          .cb-actions { display:flex; flex-direction:column; gap:10px; }
          .cb-btn { border:none; cursor:pointer; font-weight:700; font-size:14px; border-radius:14px; padding:14px 20px;
            display:flex; align-items:center; justify-content:center; gap:8px;
            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
          .cb-btn:hover { transform: translateY(-2px); }
          .cb-btn-primary { background:${GRADIENT}; color:${C.white}; box-shadow:0 8px 24px ${C.accent}40; }
          .cb-btn-primary:hover { box-shadow:0 12px 32px ${C.accent}55; }
          .cb-btn-outline { background:${C.white}; color:${C.text}; border:1.5px solid ${C.border}; }
          .cb-btn-outline:hover { border-color:${C.accent}; color:${C.accent}; background:${C.light}; }

          @keyframes cbFadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
          @keyframes cbPop { from { transform:scale(0.7); opacity:0; } to { transform:scale(1); opacity:1; } }
          @keyframes cbRing { 0% { transform:scale(0.9); opacity:0.8; } 100% { transform:scale(1.35); opacity:0; } }

          @media (max-width: 640px) {
            .cb-hero { padding:40px 18px 32px; }
            .cb-container { padding:24px 16px 48px; }
            .cb-title { font-size:22px; }
            .cb-icon-wrap, .cb-icon-circle { width:76px; height:76px; }
          }
        `}</style>

        <div className="cb-topbar">
          <div className="cb-topbar-inner">
            <BackBtn label="Back to booking page" onClick={() => navigate(`/book/${slug}`)} />
          </div>
        </div>

        <div className="cb-hero">
          <div className="cb-hero-inner">
            <div className="cb-icon-wrap">
              <div className="cb-icon-ring" />
              <div className="cb-icon-circle"><XCircleFill size={38} color={C.white}/></div>
            </div>
            <span className="cb-status-badge"><XCircleFill size={10}/> BOOKING CANCELLED</span>
            <h1 className="cb-title">{title}</h1>
            <p className="cb-sub">{fmtDur(booking.duration_minutes)} · {fmtPrice(total)}</p>
            {cancelledLabel && (
              <span className="cb-cancelled-chip"><CalendarX size={12}/> Cancelled on {cancelledLabel}</span>
            )}
          </div>
        </div>

        <div className="cb-container">
          <div className="cb-container-inner">

            <div className="cb-card">
              <p className="cb-card-title">Booking Details</p>
              {detailRows.map((row) => (
                <div key={row.label} className="cb-detail-row">
                  <div className="cb-detail-icon">{row.icon}</div>
                  <div className="cb-detail-text">
                    <span className="cb-detail-label">{row.label}</span>
                    <span className="cb-detail-value">{row.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cb-message-box">
              <div className="cb-message-icon"><XCircleFill size={15}/></div>
              <div>
                <p>Your appointment has been cancelled successfully.</p>
                <p>If this was a mistake, you can book another appointment anytime.</p>
              </div>
            </div>

            <div className="cb-timeline">
              <div className="cb-timeline-item">
                <div className="cb-timeline-dot done"><CalendarCheck size={14}/></div>
                <div className="cb-timeline-text">
                  <span className="cb-timeline-label">Appointment Booked</span>
                  {createdLabel && <span className="cb-timeline-time">{createdLabel}</span>}
                </div>
              </div>
              <div className="cb-timeline-item">
                <div className="cb-timeline-dot done"><EnvelopeCheck size={14}/></div>
                <div className="cb-timeline-text">
                  <span className="cb-timeline-label">Confirmation Sent</span>
                </div>
              </div>
              <div className="cb-timeline-item">
                <div className="cb-timeline-dot cancelled"><XCircleFill size={14}/></div>
                <div className="cb-timeline-text">
                  <span className="cb-timeline-label">Booking Cancelled</span>
                  {cancelledLabel && <span className="cb-timeline-time">{cancelledLabel}</span>}
                </div>
              </div>
            </div>

            <div className="cb-actions">
              <button className="cb-btn cb-btn-primary" onClick={() => navigate(`/book/${slug}`)}>
                Book New Appointment
              </button>
              <button className="cb-btn cb-btn-outline" onClick={() => navigate(`/book/${slug}`)}>
                <ArrowLeft size={14}/> Back to Salon
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-page">

      <style>{`
        .mb-page { height:100vh; overflow-y:auto; display:flex; flex-direction:column;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${C.light}; }
        .mb-topbar { width:100%; padding:16px 24px; box-sizing:border-box; background:${C.white}; border-bottom:1px solid ${C.border}; }
        .mb-topbar-inner { max-width:680px; margin:0 auto; }
        .mb-hero { width:100%; padding:56px 24px 44px; box-sizing:border-box;
          background:linear-gradient(135deg, #f5f3ff 0%, #faf5ff 45%, #f8fafc 100%); text-align:center; }
        .mb-hero-inner { max-width:680px; margin:0 auto; display:flex; flex-direction:column; align-items:center; }
        .mb-icon-wrap { position:relative; width:92px; height:92px; margin-bottom:20px; }
        .mb-icon-ring { position:absolute; inset:0; border-radius:50%; border:3px solid ${C.med};
          animation: mbRing 1.6s ease-out infinite; }
        .mb-icon-circle { width:92px; height:92px; border-radius:50%;
          background:${GRADIENT}; display:flex; align-items:center; justify-content:center;
          box-shadow:0 10px 30px ${C.accent}55; animation: mbPop 0.5s cubic-bezier(.4,0,.2,1); }
        .mb-status-badge { display:inline-flex; align-items:center; gap:6px; background:${C.med}; color:${C.accentDark};
          font-size:11.5px; font-weight:800; letter-spacing:0.06em; padding:6px 14px; border-radius:999px; margin-bottom:14px; }
        .mb-title { margin:0 0 4px; font-size:26px; font-weight:900; color:${C.text}; }
        .mb-sub { margin:0 0 16px; font-size:14px; color:${C.muted}; font-weight:600; }

        .mb-container { flex:1; width:100%; padding:32px 24px 64px; box-sizing:border-box; }
        .mb-container-inner { max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }

        .mb-card { background:rgba(255,255,255,0.75); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          border:1.5px solid ${C.border}; border-radius:22px; padding:22px 22px 8px; box-shadow:0 8px 32px rgba(46,16,101,0.08);
          animation: mbFadeIn 0.5s cubic-bezier(.4,0,.2,1); }
        .mb-card-title { margin:0 0 14px; font-size:12.5px; font-weight:800; color:${C.text};
          text-transform:uppercase; letter-spacing:0.06em; }
        .mb-detail-row { display:flex; align-items:center; gap:12px; padding:12px 2px; border-bottom:1px solid ${C.border}; }
        .mb-detail-row:last-child { border-bottom:none; }
        .mb-detail-icon { width:34px; height:34px; border-radius:10px; background:${C.light}; color:${C.accent};
          display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mb-detail-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .mb-detail-label { font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; }
        .mb-detail-value { font-size:13.5px; font-weight:700; color:${C.text}; word-break:break-word; }

        .mb-actions-card { background:${C.white}; border:1.5px solid ${C.border}; border-radius:22px;
          padding:22px; box-shadow:0 8px 32px rgba(46,16,101,0.06); animation: mbFadeIn 0.55s cubic-bezier(.4,0,.2,1); }
        .mb-actions { display:flex; flex-direction:column; gap:10px; }
        .mb-btn { border:none; cursor:pointer; font-weight:700; font-size:14px; border-radius:14px; padding:14px 20px;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
        .mb-btn:hover { transform: translateY(-2px); }
        .mb-btn-primary { background:${GRADIENT}; color:${C.white}; box-shadow:0 8px 24px ${C.accent}40; }
        .mb-btn-primary:hover { box-shadow:0 12px 32px ${C.accent}55; }
        .mb-btn-outline { background:${C.white}; color:${C.text}; border:1.5px solid ${C.border}; }
        .mb-btn-outline:hover { border-color:${C.accent}; color:${C.accent}; background:${C.light}; }
        .mb-btn-danger-outline { background:${C.white}; color:#dc2626; border:1.5px solid #fecaca; }
        .mb-btn-danger-outline:hover { border-color:#dc2626; background:#fef2f2; }
        .mb-btn-danger { background:#dc2626; color:${C.white}; }
        .mb-btn-danger:hover { box-shadow:0 12px 28px rgba(220,38,38,0.35); }

        .mb-warn-box { background:#fef2f2; border:1.5px solid #fecaca; border-radius:14px; padding:16px 18px; margin-bottom:16px; }
        .mb-warn-title { margin:0 0 4px; font-size:14px; font-weight:700; color:#991b1b; }
        .mb-warn-sub { margin:0; font-size:12.5px; color:#b91c1c; }

        .mb-error-text { font-size:12.5px; color:#dc2626; margin:0; }
        .mb-error-text--top { margin:0 0 4px; }
        .mb-error-text--gap { margin:0 0 12px; }
        .mb-error-text--top-gap { margin-top:10px; }

        .mb-btn-row { display:flex; gap:10px; }
        .mb-btn-row--top { margin-top:18px; }
        .mb-btn--flex1 { flex:1; }
        .mb-btn--flex2 { flex:2; }

        .mb-date-grid { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
        .mb-date-btn { background:${C.white}; border:1.5px solid ${C.border}; border-radius:14px;
          padding:10px 14px; cursor:pointer; text-align:center; color:${C.text}; min-width:58px; }
        .mb-date-btn.active { background:${GRADIENT}; border-color:${C.accent}; color:${C.white}; }
        .mb-date-day { font-size:9.5px; font-weight:700; opacity:0.55; margin-bottom:3px; letter-spacing:0.06em; }
        .mb-date-btn.active .mb-date-day { opacity:0.85; }
        .mb-date-num { font-size:20px; font-weight:900; line-height:1; }
        .mb-date-month { font-size:9.5px; opacity:0.45; margin-top:3px; }
        .mb-date-btn.active .mb-date-month { opacity:0.8; }

        .mb-time-grid { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }

        .mb-btn-confirm { background:${C.med}; color:${C.muted}; cursor:not-allowed; }
        .mb-btn-confirm.enabled { background:${GRADIENT}; color:${C.white};
          box-shadow:0 8px 24px ${C.accent}40; cursor:pointer; }

        @keyframes mbFadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes mbPop { from { transform:scale(0.7); opacity:0; } to { transform:scale(1); opacity:1; } }
        @keyframes mbRing { 0% { transform:scale(0.9); opacity:0.8; } 100% { transform:scale(1.35); opacity:0; } }

        @media (max-width: 640px) {
          .mb-hero { padding:40px 18px 32px; }
          .mb-container { padding:24px 16px 48px; }
          .mb-title { font-size:22px; }
          .mb-icon-wrap, .mb-icon-circle { width:76px; height:76px; }
        }
      `}</style>

      <div className="mb-topbar">
        <div className="mb-topbar-inner">
          <BackBtn label="Back to booking page" onClick={() => navigate(`/book/${slug}`)} />
        </div>
      </div>

      <div className="mb-hero">
        <div className="mb-hero-inner">
          <div className="mb-icon-wrap">
            <div className="mb-icon-ring" />
            <div className="mb-icon-circle"><CheckCircleFill size={38} color={C.white}/></div>
          </div>
          <span className="mb-status-badge"><CheckCircleFill size={10}/> UPCOMING APPOINTMENT</span>
          <h1 className="mb-title">{title}</h1>
          <p className="mb-sub">{fmtDur(booking.duration_minutes)} · {fmtPrice(total)}</p>
        </div>
      </div>

      <div className="mb-container">
        <div className="mb-container-inner">

          <div className="mb-card">
            <p className="mb-card-title">Booking Details</p>
            {[
              { icon:<PersonFill size={13}/>, label:"Stylist", value: booking.staff_name || "Any available" },
              { icon:<CalendarEvent size={13}/>, label:"Date", value: dateLabel },
              { icon:<ClockFill size={13}/>, label:"Time", value: timeLabel },
              ...(booking.client_phone ? [{ icon:<TelephoneFill size={13}/>, label:"Phone Number", value:String(booking.client_phone) }] : []),
            ].map((row) => (
              <div key={row.label} className="mb-detail-row">
                <div className="mb-detail-icon">{row.icon}</div>
                <div className="mb-detail-text">
                  <span className="mb-detail-label">{row.label}</span>
                  <span className="mb-detail-value">{row.value}</span>
                </div>
              </div>
            ))}
          </div>

          {mode === "view" && (
            <div className="mb-actions-card">
              <div className="mb-actions">
                {actionError && <p className="mb-error-text mb-error-text--top">{actionError}</p>}
                <button className="mb-btn mb-btn-primary" onClick={() => setMode("reschedule")} disabled={actionLoading}>
                  <CalendarEvent size={14}/> Reschedule
                </button>
                <button className="mb-btn mb-btn-danger-outline" onClick={() => setMode("confirmCancel")} disabled={actionLoading}>
                  <XCircleFill size={14}/> Cancel Booking
                </button>
              </div>
            </div>
          )}

          {mode === "confirmCancel" && (
            <div className="mb-actions-card">
              <div className="mb-warn-box">
                <p className="mb-warn-title">Cancel this appointment?</p>
                <p className="mb-warn-sub">This can't be undone.</p>
              </div>
              {actionError && <p className="mb-error-text mb-error-text--gap">{actionError}</p>}
              <div className="mb-btn-row">
                <button className="mb-btn mb-btn-outline mb-btn--flex1" onClick={() => setMode("view")} disabled={actionLoading}>
                  Keep Booking
                </button>
                <button className="mb-btn mb-btn-danger mb-btn--flex1" onClick={handleCancel} disabled={actionLoading}>
                  {actionLoading ? "Cancelling…" : "Yes, Cancel It"}
                </button>
              </div>
            </div>
          )}

          {mode === "reschedule" && (
            <div className="mb-actions-card">
              <SectionHead title="Choose a New Date" sub="Pick your preferred day" />
              <div className="mb-date-grid">
                {dates.map((d, i) => {
                  const act = d.toDateString() === selDate.toDateString();
                  return (
                    <button key={i} className={`mb-date-btn${act ? " active" : ""}`}
                      onClick={() => { setSelDate(d); setSelTime(null); }}>
                      <div className="mb-date-day">
                        {i === 0 ? "TODAY" : DAYS[d.getDay()].toUpperCase()}
                      </div>
                      <div className="mb-date-num">{d.getDate()}</div>
                      <div className="mb-date-month">{MONTHS[d.getMonth()]}</div>
                    </button>
                  );
                })}
              </div>

              <SectionHead title="Available Times" sub={`${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}`} />
              <div className="mb-time-grid">
                {[...slots.morning, ...slots.afternoon].map((t) => (
                  <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime} />
                ))}
              </div>

              {actionError && <p className="mb-error-text mb-error-text--top-gap">{actionError}</p>}

              <div className="mb-btn-row mb-btn-row--top">
                <button className="mb-btn mb-btn-outline mb-btn--flex1" onClick={() => { setMode("view"); setActionError(null); }}>
                  Back
                </button>
                <button className={`mb-btn mb-btn--flex2 mb-btn-confirm${selTime ? " enabled" : ""}`}
                  onClick={handleReschedule} disabled={!selTime || actionLoading}>
                  {actionLoading ? "Saving…" : "Confirm New Time"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
