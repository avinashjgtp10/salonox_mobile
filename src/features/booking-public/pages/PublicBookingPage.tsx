import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search as SearchIcon, Check, CheckLg, StarFill, PeopleFill,
  Scissors, CalendarEvent, PersonFill, GeoAltFill, TelephoneFill,
  Instagram, Facebook, Globe, PinMapFill, Plus,
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

// 1 = salon page + catalogue (the landing), then stylist, date, details,
// review, confirmation.
type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");
  const preselectStaffId   = searchParams.get("staffId");
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { salonDetails, loading, bookingLoading, error } = useAppSelector((s) => s.onlineBooking);

  // Starts on the catalogue, not a splash screen.
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
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

  // Each screen is its own page in this flow, so a step change starts at the top.
  // Scrolls the page root, not the window: index.css pins body to
  // `overflow: hidden`, so window.scrollTo is a no-op here.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

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
        // Lets the server narrow "any stylist" to staff who can actually
        // perform what's in the basket.
        serviceIds: selServices.map((s) => String(s.id)).join(","),
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

  // ── Catalogue ───────────────────────────────────────────────────────────────
  // A salon can publish hundreds of services (one has 496), so browsing needs a
  // way in: categories with counts, and a most-booked shortcut.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      const name = String((s as any).category_name || "Other");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [services]);

  const popular = useMemo(() => {
    if (search || activeCat !== "All") return [];
    return [...services]
      .filter((s) => Number((s as any).booking_count) > 0)
      .sort((a, b) => Number((b as any).booking_count) - Number((a as any).booking_count))
      .slice(0, 6);
  }, [services, search, activeCat]);

  const filtered = useMemo(() => services.filter((s) => {
    const catOk = activeCat === "All" || String((s as any).category_name || "Other") === activeCat;
    const q = search.trim().toLowerCase();
    const searchOk = !q
      || s.name.toLowerCase().includes(q)
      || String((s as any).category_name || "").toLowerCase().includes(q);
    return catOk && searchOk;
  }), [services, activeCat, search]);

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

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

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

  // Neutral by default; a salon's own brand kit overrides the accent so the page
  // reads as theirs. No brand kit exists for any salon today (the editor was
  // removed), so in practice everyone gets the neutral palette — the wiring is
  // here so it just works the moment one is populated.
  const brand = (salon as any)?.brand_kit ?? null;
  const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v.trim());
  const brandAccent = isHex(brand?.primary_color) ? brand.primary_color
    : isHex(brand?.accent_color) ? brand.accent_color
    : null;

  const styleVars = {
    "--pb-light": "#f7f7f8",
    "--pb-med": "#f1f2f4",
    "--pb-border": "#e5e7eb",
    "--pb-border-soft": "#f0f1f3",
    "--pb-text": isHex(brand?.text_color) ? brand.text_color : "#111827",
    "--pb-muted": "#6b7280",
    "--pb-white": "#ffffff",
    ...(brandAccent ? { "--pb-accent": brandAccent, "--pb-ink": brandAccent } : {}),
    ...(brand?.body_font ? { fontFamily: `${brand.body_font}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` } : {}),
  } as React.CSSProperties;

  // None of these services have photos (image_url is empty across the entire
  // catalogue), so a grid of image frames would be a grid of empty boxes. A
  // monogram tile keyed to the category keeps the grid varied and scannable.
  const ServiceCard = ({ svc, popular: isPopular }: { svc: ServiceItem; popular?: boolean }) => {
    const on = selServices.some((s) => s.id === svc.id);
    return (
      <button
        type="button"
        className={`pb__svc ${on ? "is-selected" : ""}`}
        onClick={() => toggleService(svc)}
        aria-pressed={on}
      >
        {serviceTile(svc)}
        <span className="pb__svc-body">
          <span className="pb__svc-name">{svc.name}</span>
          <span className="pb__svc-meta">
            <span className="pb__svc-price">{fmtPrice(svc.price, currencyCode)}</span>
            {Number(svc.duration) > 0 && (
              <>
                <span className="pb__svc-dot">·</span>
                <span>{fmtDur(Number(svc.duration))}</span>
              </>
            )}
            {isPopular && <span className="pb__badge">Popular</span>}
          </span>
        </span>
        <span className="pb__svc-add" aria-hidden="true">
          {on ? <Check size={14} /> : <Plus size={15} />}
        </span>
      </button>
    );
  };

  const serviceTile = (svc: ServiceItem) => {
    const img = (svc as any).image_url;
    const key = String((svc as any).category_name || svc.name);
    return (
      <span className="pb__svc-tile" style={{ background: `hsl(${hashHue(key)},46%,46%)` }}>
        {img ? <img src={img} alt="" /> : key.trim().charAt(0).toUpperCase() || <Scissors size={16} />}
      </span>
    );
  };

  // ── Screens ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb" ref={rootRef} style={styleVars}>

      {/* 1 — Salon page: hero + service catalogue.
           Deliberately not a splash screen you click through. Landing straight
           on the catalogue is the browse-first model, one less tap, and it
           fills a desktop viewport instead of floating a card in white space. */}
      {step === 1 && (
        <>
          <div className="pb__hero">
            <div className="pb__hero-media">
              <img src={coverUrl} alt="" />
            </div>
            <div className="pb__hero-overlay">
              <div className="pb__hero-inner">
                <p className="pb__hero-eyebrow">Look good • Feel great</p>
                <h1 className="pb__hero-title">{salonName}</h1>
                <p className="pb__hero-meta">
                  {address && <span><GeoAltFill size={12} /> {address}</span>}
                  {Number(salon?.rating) > 0 && (
                    <span><StarFill size={12} /> {Number(salon.rating).toFixed(1)}
                      {Number(salon?.review_count) > 0 ? ` (${salon.review_count})` : ""}
                    </span>
                  )}
                  <span>{services.length} services</span>
                </p>
                <div className="pb__hero-actions">
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
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={instagramUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={14} /></a>
                  )}
                  {facebookUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={facebookUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={14} /></a>
                  )}
                  {websiteUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={websiteUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Website"><Globe size={14} /></a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pb__shell pb__shell--wide">
            {description && <p className="pb__about">{description}</p>}

            <div className="pb__search">
              <SearchIcon size={15} />
              <input
                id="pb-service-search"
                className="pb__search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${services.length} services…`}
                aria-label="Search services"
              />
            </div>

            <div className="pb__catalogue">
              {/* Category rail — vertical on desktop, the scrolling pill bar
                  below it is the same control at phone widths. */}
              {categories.length > 1 && (
                <aside className="pb__side" aria-label="Service categories">
                  <p className="pb__side-title">Categories</p>
                  <div className="pb__side-list" role="tablist" aria-orientation="vertical">
                    <button type="button" role="tab" aria-selected={activeCat === "All"}
                      className={`pb__side-item ${activeCat === "All" ? "is-active" : ""}`}
                      onClick={() => setActiveCat("All")}>
                      <span className="pb__side-name">All services</span>
                      <span className="pb__side-count">{services.length}</span>
                    </button>
                    {categories.map((c) => (
                      <button key={c.name} type="button" role="tab" aria-selected={activeCat === c.name}
                        className={`pb__side-item ${activeCat === c.name ? "is-active" : ""}`}
                        onClick={() => setActiveCat(c.name)}>
                        <span className="pb__side-name">{c.name}</span>
                        <span className="pb__side-count">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </aside>
              )}

              <div className="pb__main">

            {categories.length > 1 && (
              <div className="pb__catbar" role="tablist" aria-label="Service categories">
                <button type="button" role="tab" aria-selected={activeCat === "All"}
                  className={`pb__cat ${activeCat === "All" ? "is-active" : ""}`}
                  onClick={() => setActiveCat("All")}>
                  All <span className="pb__cat-count">{services.length}</span>
                </button>
                {categories.map((c) => (
                  <button key={c.name} type="button" role="tab" aria-selected={activeCat === c.name}
                    className={`pb__cat ${activeCat === c.name ? "is-active" : ""}`}
                    onClick={() => setActiveCat(c.name)}>
                    {c.name} <span className="pb__cat-count">{c.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Most booked — real appointment counts, not a curated guess. Only
                on the unfiltered view, where it's a way in rather than noise. */}
            {popular.length > 0 && (
              <>
                <div className="pb__section-head">
                  <h2 className="pb__section-title">Most booked</h2>
                  <p className="pb__section-note">Popular at this salon</p>
                </div>
                <div className="pb__grid">
                  {popular.map((svc) => (
                    <ServiceCard key={`pop-${svc.id}`} svc={svc} popular />
                  ))}
                </div>
              </>
            )}

            <div className="pb__section-head">
              <h2 className="pb__section-title">
                {activeCat === "All" ? "All services" : activeCat}
              </h2>
              <p className="pb__section-note">
                {filtered.length} {filtered.length === 1 ? "service" : "services"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="pb__empty">
                {search
                  ? `No services match “${search}”.`
                  : "This salon hasn't published any services yet."}
              </p>
            ) : (
              <div className="pb__grid">
                {filtered.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
              </div>
            )}

              </div>
            </div>

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
                    Try another date
                    {phone ? <> or call the salon on <a href={`tel:${phone}`}>{phone}</a></> : null}.
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
