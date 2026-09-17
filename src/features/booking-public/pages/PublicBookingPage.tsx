import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search as SearchIcon, Check, CheckLg, StarFill, PeopleFill,
  Scissors, CalendarEvent, PersonFill, GeoAltFill, TelephoneFill,
  Instagram, Facebook, Globe, PinMapFill,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ONLINE_BOOKING } from "../../../services/api/endpoints";
import {
  fetchPublicSalonBySlugThunk,
  createPublicBookingThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  C, DAYS, MONTHS, staffName, initials, fmtDur, fmtPrice, hashHue,
  salonDateStr, toSalonInstant,
  type ServiceItem, type StaffMember,
} from "../../online-booking/components/BookingFlow/shared";
import CalendarPicker from "../components/CalendarPicker";
import "../styles/PublicBooking.scss";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=1600";

function buildAddress(salon: any): string {
  if (!salon) return "";
  const addr = salon.address;
  if (addr && typeof addr === "object") {
    return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
  }
  return [addr, salon.city, salon.state, salon.pincode].filter(Boolean).join(", ");
}

/** A UUID is unusable as something a customer reads out over the phone. */
function shortBookingId(id?: string | null): string {
  if (!id) return "—";
  return `#BK${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const STEP_LABELS = ["Services", "Stylist", "Date & Time", "Details"] as const;

// Landing = 0, then the four stepper screens, then review and confirmation.
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");
  const preselectStaffId   = searchParams.get("staffId");
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { salonDetails, loading, bookingLoading, error } = useAppSelector((s) => s.onlineBooking);

  const [step, setStep] = useState<Step>(0);
  const [search, setSearch] = useState("");
  const [selServices, setSelServices] = useState<ServiceItem[]>([]);
  const [selStaff, setSelStaff] = useState<StaffMember | "any" | null>("any");
  const [selDate, setSelDate] = useState<Date>(new Date());
  const [selTime, setSelTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", countryCode: "+91", notes: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preselected, setPreselected] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  useEffect(() => {
    if (slug) dispatch(fetchPublicSalonBySlugThunk(slug));
  }, [slug, dispatch]);

  // Each screen is its own page in this flow, so a step change starts at the top
  // rather than wherever the previous screen was scrolled to.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const services: ServiceItem[] = salonDetails?.services ?? [];
  const staffList: StaffMember[] = salonDetails?.staff ?? [];
  const salon = salonDetails?.salon ?? null;
  const salonName = salon?.business_name || salon?.display_name || salon?.name || "This salon";
  const currencyCode: string | undefined = salon?.currency;
  const coverUrl = salon?.cover_url || salon?.banner_url || DEFAULT_COVER_IMAGE;
  const address = buildAddress(salon);
  const phone: string = salon?.phone ?? "";

  const cancellationNoticeHours: number = Number(salon?.cancellation_notice_hours) || 0;

  // A map link is only ever built from a real configured address. Falling back
  // to the salon's *name* hands Google a search term that resolves to an
  // unrelated business — a confidently wrong pin is worse than none.
  const mapQuery: string = useMemo(() => {
    const trimmed = (address ?? "").trim();
    return trimmed.length >= 6 ? trimmed : "";
  }, [address]);

  // Only an explicit false narrows these — an older salon record, or a database
  // without the columns yet, keeps today's behaviour.
  const allowSameDay: boolean = salon?.allow_same_day_booking !== false;
  const allowMultipleServices: boolean = salon?.allow_multiple_services !== false;
  const aboutEnabled: boolean = salon?.about_enabled !== false;
  const instagramUrl: string = aboutEnabled ? String(salon?.instagram_url ?? "").trim() : "";
  const facebookUrl: string = aboutEnabled ? String(salon?.facebook_url ?? "").trim() : "";
  const websiteUrl: string = aboutEnabled ? String(salon?.website ?? "").trim() : "";
  const description: string = aboutEnabled
    ? String(salon?.marketplace_description ?? salon?.description ?? "").trim()
    : "";

  // 0/absent means "not configured" — fall back to the same 30-day default the
  // backend uses rather than locking the picker down to today.
  const maxAdvanceDays: number = Number(salon?.max_advance_days) > 0
    ? Number(salon.max_advance_days)
    : 30;

  // Pre-select service/staff from the query params once data has loaded.
  useEffect(() => {
    if (preselected || loading || (!preselectServiceId && !preselectStaffId)) return;
    if (services.length === 0 && staffList.length === 0) return;

    let nextStep: Step = 1;
    if (preselectServiceId) {
      const svc = services.find((s) => String(s.id) === preselectServiceId);
      if (svc) { setSelServices([svc]); nextStep = 2; }
    }
    if (preselectStaffId) {
      const st = staffList.find((s) => String(s.id) === preselectStaffId);
      if (st) setSelStaff(st);
    }
    setStep(nextStep);
    setPreselected(true);
  }, [preselected, loading, services, staffList, preselectServiceId, preselectStaffId]);

  // The picker opens on today. If the salon doesn't take same-day bookings,
  // move to tomorrow once the salon's settings have loaded, so the flow never
  // starts on a date the calendar has disabled.
  useEffect(() => {
    if (allowSameDay) return;
    const today = new Date();
    if (selDate.toDateString() !== today.toDateString()) return;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelDate(tomorrow);
    setSelTime(null);
  }, [allowSameDay, selDate]);

  const totalDuration = useMemo(
    () => selServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
    [selServices]
  );
  const totalPrice = useMemo(
    () => selServices.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0),
    [selServices]
  );

  // Real availability for the chosen stylist, date and total duration.
  const [slots, setSlots] = useState<{ morning: string[]; afternoon: string[] }>({ morning: [], afternoon: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    if (!salon?.id || totalDuration <= 0) { setSlots({ morning: [], afternoon: [] }); return; }
    let cancelled = false;
    setSlotsLoading(true);
    api.get(ONLINE_BOOKING.AVAILABILITY(String(salon.id)), {
      params: {
        date: salonDateStr(selDate),
        durationMinutes: totalDuration,
        ...(selStaff && selStaff !== "any" ? { staffId: String((selStaff as StaffMember).id) } : {}),
      },
    })
      .then((res) => {
        if (cancelled) return;
        const all: string[] = res.data?.data?.slots ?? [];
        setSlots({
          morning: all.filter((t) => t.endsWith("AM")),
          afternoon: all.filter((t) => t.endsWith("PM")),
        });
      })
      .catch(() => { if (!cancelled) setSlots({ morning: [], afternoon: [] }); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [salon?.id, selDate, selStaff, totalDuration]);

  const filtered = services.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleService(svc: ServiceItem) {
    setSelServices((prev) => {
      const already = prev.some((s) => s.id === svc.id);
      if (already) return prev.filter((s) => s.id !== svc.id);
      // When the salon books one service per appointment, picking a second
      // replaces the first rather than adding to it.
      return allowMultipleServices ? [...prev, svc] : [svc];
    });
    // Duration changes invalidate whichever slot was picked for the old total.
    setSelTime(null);
  }

  function pickStaff(next: StaffMember | "any") {
    setSelStaff(next);
    // Slots are per-stylist; keeping the old selection would submit a time the
    // newly chosen stylist may not have free.
    setSelTime(null);
  }

  async function handleSubmit() {
    if (!salon?.id || selServices.length === 0 || !selTime) return;
    setSubmitError(null);
    try {
      const appointment = await dispatch(
        createPublicBookingThunk({
          salon_id: String(salon.id),
          service_ids: selServices.map((s) => String(s.id)),
          staff_id: selStaff === "any" ? undefined : String((selStaff as StaffMember)?.id),
          scheduled_at: toSalonInstant(selDate, String(selTime)),
          client_name: form.name.trim(),
          client_email: form.email.trim(),
          client_phone: form.phone.trim(),
          notes: form.notes.trim(),
        })
      ).unwrap();
      setCreatedAppointment(appointment);
      setStep(6);
    } catch (err: any) {
      setSubmitError(typeof err === "string" ? err : "Failed to create booking. Please try again.");
    }
  }

  function resetBooking() {
    setStep(1);
    setSelServices([]);
    setSelStaff("any");
    setSelTime(null);
    setForm({ name: "", email: "", phone: "", countryCode: "+91", notes: "" });
    setCreatedAppointment(null);
    setSubmitError(null);
  }

  const detailsValid = form.name.trim().length > 1 && form.phone.replace(/\D/g, "").length >= 8;
  const dateLabel = `${DAYS[selDate.getDay()]}, ${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
  const staffLabel = selStaff === "any" || !selStaff ? "Any Stylist" : staffName(selStaff as StaffMember);

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (!salonDetails && !error) {
    return (
      <div className="pb">
        <div className="pb__center">
          <div className="pb__spinner" />
          <p className="pb__subtitle">Loading booking page…</p>
        </div>
      </div>
    );
  }

  // Heading stays true for both cases the API distinguishes — a wrong link and
  // a salon that has online booking switched off. The specific reason comes
  // from the server and is shown beneath it.
  if (error || !salon) {
    return (
      <div className="pb">
        <div className="pb__center">
          <h2 className="pb__title">Booking unavailable</h2>
          <p className="pb__subtitle">
            {error || "This salon doesn't have a public booking page yet."}
          </p>
        </div>
      </div>
    );
  }

  // ── Shared chrome ───────────────────────────────────────────────────────────

  const goBack = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

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

  const Stepper = ({ current }: { current: 1 | 2 | 3 | 4 }) => (
    <div className="pb__steps" role="list" aria-label="Booking progress">
      {STEP_LABELS.map((label, i) => {
        const index = i + 1;
        const state = index === current ? "is-active" : index < current ? "is-done" : "";
        return (
          <div key={label} className={`pb__step ${state}`} role="listitem"
            aria-current={index === current ? "step" : undefined}>
            <span className="pb__step-dot" />
            <span className="pb__step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );

  const styleVars = {
    "--pb-accent": C.accent,
    "--pb-light": C.light,
    "--pb-med": C.med,
    "--pb-border": C.border,
    "--pb-border-soft": "#f0ecfb",
    "--pb-text": C.text,
    "--pb-muted": C.muted,
    "--pb-white": C.white,
    "--pb-ink": "#111827",
  } as React.CSSProperties;

  const serviceAvatar = (svc: ServiceItem) => (
    <span className="pb__avatar" style={{ background: `hsl(${hashHue(svc.id)},52%,52%)` }}>
      <Scissors size={18} />
    </span>
  );

  // ── Screens ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb" style={styleVars}>

      {/* 1 — Landing */}
      {step === 0 && (
        <>
          <TopBar />
          <div className="pb__shell pb__shell--landing">
            <section className="pb__hero">
              <div className="pb__hero-media">
                <img src={coverUrl} alt="" />
              </div>
              <div className="pb__hero-body">
                <p className="pb__hero-eyebrow">Look good • Feel great</p>
                <h1 className="pb__hero-title">Book Your Appointment</h1>
                <p className="pb__hero-copy">
                  {description
                    || `Choose from ${salonName}'s range of services and get the best experience.`}
                </p>
                <button
                  type="button"
                  className="pb__btn pb__btn--primary pb__btn--auto"
                  onClick={() => setStep(1)}
                  disabled={services.length === 0}
                >
                  {services.length === 0 ? "No services available" : "Book Now"}
                  {services.length > 0 && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </section>

            {(instagramUrl || facebookUrl || websiteUrl || mapQuery || phone) && (
              <div className="pb__help">
                <div>
                  <p className="pb__help-title">{salonName}</p>
                  {address && <p className="pb__help-sub">{address}</p>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {phone && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={`tel:${phone}`}>
                      <TelephoneFill size={13} /> Call
                    </a>
                  )}
                  {mapQuery && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" target="_blank" rel="noopener noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}>
                      <PinMapFill size={13} /> Directions
                    </a>
                  )}
                  {instagramUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <Instagram size={14} />
                    </a>
                  )}
                  {facebookUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                      <Facebook size={14} />
                    </a>
                  )}
                  {websiteUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={websiteUrl} target="_blank" rel="noopener noreferrer" aria-label="Website">
                      <Globe size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 2 — Select Services */}
      {step === 1 && (
        <>
          <TopBar onBack={() => setStep(0)} />
          <div className="pb__shell">
            <Stepper current={1} />
            <div className="pb__heading">
              <h1 className="pb__title">Select Services</h1>
              <p className="pb__subtitle">
                {allowMultipleServices
                  ? "Choose the services you want to book."
                  : "Choose the service you want to book."}
              </p>
            </div>

            <div className="pb__search">
              <SearchIcon size={15} />
              <input
                id="pb-service-search"
                className="pb__search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                aria-label="Search services"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="pb__empty">
                {search ? `No services match "${search}".` : "This salon hasn't published any services yet."}
              </p>
            ) : (
              <div className="pb__list">
                {filtered.map((svc) => {
                  const on = selServices.some((s) => s.id === svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      className="pb__row"
                      onClick={() => toggleService(svc)}
                      aria-pressed={on}
                    >
                      {serviceAvatar(svc)}
                      <span className="pb__row-main">
                        <span className="pb__row-title">{svc.name}</span>
                        <span className="pb__row-meta">
                          {fmtDur(Number(svc.duration) || 0)} · {fmtPrice(svc.price, currencyCode)}
                        </span>
                      </span>
                      <span className={`pb__check ${on ? "is-on" : ""}`} aria-hidden="true">
                        {on && <Check size={15} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selServices.length > 0 && (
              <div className="pb__sticky">
                <div className="pb__sticky-info">
                  <p className="pb__sticky-count">
                    {selServices.length} service{selServices.length !== 1 ? "s" : ""} selected
                    {totalDuration > 0 ? ` · ${fmtDur(totalDuration)}` : ""}
                  </p>
                  <p className="pb__sticky-total">{fmtPrice(totalPrice, currencyCode)}</p>
                </div>
                <button type="button" className="pb__btn pb__btn--primary" onClick={() => setStep(2)}>
                  Next <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3 — Select Stylist */}
      {step === 2 && (
        <>
          <TopBar onBack={goBack} />
          <div className="pb__shell">
            <Stepper current={2} />
            <div className="pb__heading">
              <h1 className="pb__title">Choose Your Stylist</h1>
              <p className="pb__subtitle">Select a stylist for your service.</p>
            </div>

            <button
              type="button"
              className={`pb__row pb__row--card ${selStaff === "any" ? "is-selected" : ""}`}
              onClick={() => pickStaff("any")}
              aria-pressed={selStaff === "any"}
            >
              <span className="pb__avatar" style={{ background: C.muted }}>
                <PeopleFill size={18} />
              </span>
              <span className="pb__row-main">
                <span className="pb__row-title">Any Stylist</span>
                <span className="pb__row-meta">We'll assign the best available stylist</span>
              </span>
              <span className={`pb__radio ${selStaff === "any" ? "is-on" : ""}`} aria-hidden="true">
                {selStaff === "any" && <span className="pb__radio-dot" />}
              </span>
            </button>

            {staffList.map((s) => {
              const on = selStaff !== "any" && (selStaff as StaffMember)?.id === s.id;
              const name = staffName(s);
              const rating = Number((s as any).rating);
              const reviewCount = Number((s as any).review_count) || 0;
              const avatar = (s as any).avatar_url;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`pb__row pb__row--card ${on ? "is-selected" : ""}`}
                  onClick={() => pickStaff(s)}
                  aria-pressed={on}
                >
                  <span className="pb__avatar pb__avatar--round"
                    style={{ background: `hsl(${hashHue(s.id)},55%,52%)` }}>
                    {avatar ? <img src={avatar} alt="" /> : initials(name)}
                  </span>
                  <span className="pb__row-main">
                    <span className="pb__row-title">{name}</span>
                    <span className="pb__row-meta">
                      <span>{(s as any).designation || s.job_title || "Stylist"}</span>
                      {/* Real review data only — a stylist with no reviews shows
                          nothing rather than an invented score. */}
                      {Number.isFinite(rating) && reviewCount > 0 && (
                        <span className="pb__rating">
                          <StarFill size={11} /> {rating.toFixed(1)}
                          <span style={{ fontWeight: 500, color: C.muted }}>({reviewCount})</span>
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={`pb__radio ${on ? "is-on" : ""}`} aria-hidden="true">
                    {on && <span className="pb__radio-dot" />}
                  </span>
                </button>
              );
            })}

            <div className="pb__sticky">
              <button type="button" className="pb__btn pb__btn--primary"
                style={{ width: "100%" }} onClick={() => setStep(3)}>
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4 — Date & Time */}
      {step === 3 && (
        <>
          <TopBar onBack={goBack} />
          <div className="pb__shell pb__shell--wide">
            <Stepper current={3} />
            <div className="pb__heading">
              <h1 className="pb__title">Select Date &amp; Time</h1>
              <p className="pb__subtitle">Pick a date and available time slot.</p>
            </div>

            <div className="pb__datetime">
              <CalendarPicker
                value={selDate}
                onChange={(d) => { setSelDate(d); setSelTime(null); }}
                maxAdvanceDays={maxAdvanceDays}
                allowSameDay={allowSameDay}
              />

              <div className="pb__slots-panel">
                <p className="pb__slots-title">Available Slots</p>
                {slotsLoading ? (
                  <p className="pb__empty">Checking availability…</p>
                ) : slots.morning.length === 0 && slots.afternoon.length === 0 ? (
                  <p className="pb__empty">
                    No times available on this date{selStaff !== "any" ? " for this stylist" : ""}.
                    Try another date.
                  </p>
                ) : (
                  <>
                    {slots.morning.length > 0 && (
                      <>
                        <p className="pb__slot-group-label">Morning</p>
                        <div className="pb__slots">
                          {slots.morning.map((t) => (
                            <button key={t} type="button"
                              className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                              aria-pressed={selTime === t}
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
                            <button key={t} type="button"
                              className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                              aria-pressed={selTime === t}
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
              <button type="button" className="pb__btn pb__btn--primary"
                style={{ width: "100%" }} disabled={!selTime} onClick={() => setStep(4)}>
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 5 — Your Details */}
      {step === 4 && (
        <>
          <TopBar onBack={goBack} />
          <div className="pb__shell">
            <Stepper current={4} />
            <div className="pb__heading">
              <h1 className="pb__title">Your Details</h1>
              <p className="pb__subtitle">Almost done!</p>
            </div>

            <div className="pb__field">
              <label className="pb__label" htmlFor="pb-name">Full Name *</label>
              <input id="pb-name" className="pb__input" value={form.name} autoComplete="name"
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </div>

            <div className="pb__field">
              <label className="pb__label" htmlFor="pb-phone">Phone Number *</label>
              <div className="pb__phone-row">
                <select id="pb-country" className="pb__phone-code" aria-label="Country code"
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
                  <option value="+91">+91</option>
                  <option value="+971">+971</option>
                  <option value="+44">+44</option>
                  <option value="+1">+1</option>
                </select>
                <input id="pb-phone" className="pb__input" value={form.phone}
                  inputMode="tel" autoComplete="tel"
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s-]/g, "") })}
                  placeholder="9876543210" />
              </div>
            </div>

            <div className="pb__field">
              <label className="pb__label" htmlFor="pb-email">
                Email <span className="pb__optional">(optional)</span>
              </label>
              <input id="pb-email" className="pb__input" value={form.email} type="email" autoComplete="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>

            <div className="pb__field">
              <label className="pb__label" htmlFor="pb-notes">
                Any special requests? <span className="pb__optional">(optional)</span>
              </label>
              <textarea id="pb-notes" className="pb__textarea" value={form.notes} rows={3}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Prefer a female stylist" />
            </div>

            <div className="pb__sticky">
              <button type="button" className="pb__btn pb__btn--primary"
                style={{ width: "100%" }} disabled={!detailsValid} onClick={() => setStep(5)}>
                Continue <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 6 — Review & Confirm */}
      {step === 5 && (
        <>
          <TopBar onBack={goBack} />
          <div className="pb__shell">
            <div className="pb__heading">
              <h1 className="pb__title">Review Your Booking</h1>
              <p className="pb__subtitle">Please check the details before confirming.</p>
            </div>

            {submitError && <p className="pb__error">{submitError}</p>}

            <div className="pb__summary">
              <div className="pb__summary-row">
                <span className="pb__summary-icon"><Scissors size={16} /></span>
                <div className="pb__summary-body">
                  <p className="pb__summary-label">Services</p>
                  {selServices.map((s) => (
                    <div key={s.id} className="pb__summary-line">
                      <span>{s.name} ({fmtDur(Number(s.duration) || 0)})</span>
                      <span>{fmtPrice(s.price, currencyCode)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pb__summary-row">
                <span className="pb__summary-icon"><PeopleFill size={16} /></span>
                <div className="pb__summary-body">
                  <p className="pb__summary-label">Stylist</p>
                  <p className="pb__summary-value">{staffLabel}</p>
                </div>
              </div>

              <div className="pb__summary-row">
                <span className="pb__summary-icon"><CalendarEvent size={16} /></span>
                <div className="pb__summary-body">
                  <p className="pb__summary-label">Date &amp; Time</p>
                  <p className="pb__summary-value">{dateLabel} • {selTime}</p>
                </div>
              </div>

              <div className="pb__summary-row">
                <span className="pb__summary-icon"><PersonFill size={16} /></span>
                <div className="pb__summary-body">
                  <p className="pb__summary-label">Your Details</p>
                  <p className="pb__summary-value">
                    {form.name}<br />
                    {form.countryCode} {form.phone}
                    {form.email ? <><br />{form.email}</> : null}
                  </p>
                </div>
              </div>

              <div className="pb__total">
                <span>Total Amount</span>
                <span>{fmtPrice(totalPrice, currencyCode)}</span>
              </div>
            </div>

            {cancellationNoticeHours > 0 && (
              <p className="pb__confirm-note">
                Free cancellation up to {cancellationNoticeHours} hour
                {cancellationNoticeHours === 1 ? "" : "s"} before your appointment.
              </p>
            )}

            <div className="pb__sticky">
              <button type="button" className="pb__btn pb__btn--primary" style={{ width: "100%" }}
                disabled={bookingLoading} onClick={handleSubmit}>
                {bookingLoading ? "Confirming…" : "Confirm Booking"}
                {!bookingLoading && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 7 — Booking Confirmation */}
      {step === 6 && (
        <>
          <TopBar />
          <div className="pb__shell">
            <div className="pb__confirm">
              <div className="pb__confirm-mark"><CheckLg size={32} /></div>
              <h1 className="pb__confirm-title">Booking Confirmed!</h1>
              <p className="pb__confirm-sub">Your appointment has been booked successfully.</p>
            </div>

            <div className="pb__summary">
              <dl className="pb__kv">
                <dt>Booking ID</dt>
                <dd>{shortBookingId(createdAppointment?.id)}</dd>
                <dt>Date &amp; Time</dt>
                <dd>{dateLabel}, {selTime}</dd>
                <dt>Services</dt>
                <dd>{selServices.map((s) => s.name).join(", ")}</dd>
                <dt>Stylist</dt>
                <dd>{staffLabel}</dd>
                <dt>Amount</dt>
                <dd>{fmtPrice(totalPrice, currencyCode)}</dd>
              </dl>
            </div>

            <div className="pb__actions">
              {createdAppointment?.id && createdAppointment?.manage_token && (
                <button type="button" className="pb__btn pb__btn--primary"
                  onClick={() => navigate(`/book/${slug}/manage/${createdAppointment.id}?token=${createdAppointment.manage_token}`)}>
                  View Booking
                </button>
              )}
              <button type="button" className="pb__btn pb__btn--ghost" onClick={resetBooking}>
                Book Another Appointment
              </button>
            </div>

            <p className="pb__confirm-note">
              A confirmation has been sent to your phone{form.email ? " and email" : ""}.
            </p>

            {mapQuery && (
              <div className="pb__help">
                <div>
                  <p className="pb__help-title">Getting there</p>
                  <p className="pb__help-sub">{address}</p>
                </div>
                <a className="pb__btn pb__btn--ghost pb__btn--auto" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}>
                  <GeoAltFill size={13} /> Directions
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
